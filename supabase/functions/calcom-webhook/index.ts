// Edge Function: calcom-webhook
// Receives Cal.com BOOKING_CREATED / BOOKING_CANCELLED events.
// - BOOKING_CREATED : crée le meeting + logique coaching One+ (Contrat 5) + notification client
// - BOOKING_CANCELLED : annule le meeting, recrédite la séance ou annule l'item facturable
//
// Chantier 2026-07-06 (T3 Coaching) :
// - Suppression de l'insert meeting_requests (table supprimée par la migration 00108)
// - Coaching One+ : si client_configs.elio_tier = 'one_plus', le RDV est une séance de
//   coaching (meetings.type='coaching'). Solde > 0 → débit du ledger ; sinon → billable_items
//   (45 € hors forfait) + notification adaptée. Le tout est NON bloquant : le meeting se crée
//   toujours, même si les tables coaching n'existent pas encore.
// - Notifications : shape correcte (recipient_type/recipient_id/body/link) + type 'system'
//   (l'ancien type 'meeting_scheduled' n'est pas dans la CHECK notifications_type_check →
//   les notifs étaient silencieusement perdues).

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const COACHING_SESSION_PRICE_CENTS = 4500

async function verifyCalcomSignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return computed === signature.toLowerCase()
}

function formatDateFr(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' })
}

interface CoachingOutcome {
  isCoaching: boolean
  creditUsed: boolean
  balanceAfter: number | null
  billedOutOfPlan: boolean
}

/**
 * Logique coaching One+ après création du meeting.
 * Robuste : toute erreur (tables/fonction coaching absentes, RPC KO…) est loggée
 * et n'empêche JAMAIS la création du meeting ni la notification standard.
 */
async function applyCoachingLogic(
  supabase: SupabaseClient,
  clientId: string,
  meetingId: string,
  startTime: string
): Promise<CoachingOutcome> {
  const none: CoachingOutcome = { isCoaching: false, creditUsed: false, balanceAfter: null, billedOutOfPlan: false }

  try {
    const { data: config, error: configError } = await supabase
      .from('client_configs')
      .select('elio_tier, coaching_monthly_credits')
      .eq('client_id', clientId)
      .maybeSingle()

    if (configError || !config || config.elio_tier !== 'one_plus') {
      if (configError) {
        console.error('[VISIO:CALCOM_WEBHOOK] client_configs lookup error (non-blocking):', configError)
      }
      return none
    }

    // Client One+ → la réservation est une séance de coaching
    const { error: typeError } = await supabase
      .from('meetings')
      .update({ type: 'coaching' })
      .eq('id', meetingId)

    if (typeError) {
      // CHECK 'coaching' pas encore déployé → on reste en meeting standard, sans bloquer
      console.error('[VISIO:CALCOM_WEBHOOK] meetings.type=coaching update error (non-blocking):', typeError)
      return none
    }

    const { data: balance, error: balanceError } = await supabase
      .rpc('get_coaching_balance', { p_client_id: clientId })

    if (balanceError || typeof balance !== 'number') {
      console.error('[VISIO:CALCOM_WEBHOOK] get_coaching_balance error (non-blocking):', balanceError)
      return { isCoaching: true, creditUsed: false, balanceAfter: null, billedOutOfPlan: false }
    }

    if (balance > 0) {
      // Séance incluse → débit d'un crédit
      const { error: ledgerError } = await supabase.from('coaching_credit_ledger').insert({
        client_id: clientId,
        delta: -1,
        reason: 'session_booked',
        meeting_id: meetingId,
        created_by: 'calcom-webhook',
      })

      if (ledgerError) {
        console.error('[VISIO:CALCOM_WEBHOOK] ledger insert error (non-blocking):', ledgerError)
        return { isCoaching: true, creditUsed: false, balanceAfter: balance, billedOutOfPlan: false }
      }

      return { isCoaching: true, creditUsed: true, balanceAfter: balance - 1, billedOutOfPlan: false }
    }

    // Solde épuisé → séance hors forfait, facturée 45 € (billable_items — Contrat 5, équipier Billing)
    const { error: billableError } = await supabase.from('billable_items').insert({
      client_id: clientId,
      item_type: 'coaching_session',
      label: `Séance coaching du ${formatDateFr(startTime)}`,
      amount_cents: COACHING_SESSION_PRICE_CENTS,
      status: 'pending',
      meeting_id: meetingId,
    })

    if (billableError) {
      // Table billable_items pas encore déployée → séance non facturée, on le logge
      console.error('[VISIO:CALCOM_WEBHOOK] billable_items insert error (non-blocking):', billableError)
      return { isCoaching: true, creditUsed: false, balanceAfter: 0, billedOutOfPlan: false }
    }

    return { isCoaching: true, creditUsed: false, balanceAfter: 0, billedOutOfPlan: true }
  } catch (err) {
    console.error('[VISIO:CALCOM_WEBHOOK] Coaching logic unexpected error (non-blocking):', err)
    return none
  }
}

/** Notification client (best-effort, jamais bloquante). Shape alignée sur billing-sync. */
async function notifyClient(
  supabase: SupabaseClient,
  clientId: string,
  title: string,
  body: string,
  link: string
): Promise<void> {
  try {
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('auth_user_id')
      .eq('id', clientId)
      .single()

    if (!clientRecord?.auth_user_id) return

    const { error } = await supabase.from('notifications').insert({
      recipient_type: 'client',
      recipient_id: clientRecord.auth_user_id,
      type: 'system',
      title,
      body,
      link,
    })

    if (error) {
      console.error('[VISIO:CALCOM_WEBHOOK] Notification error (non-blocking):', error)
    }
  } catch (err) {
    console.error('[VISIO:CALCOM_WEBHOOK] Notification unexpected error (non-blocking):', err)
  }
}

async function handleBookingCreated(
  supabase: SupabaseClient,
  payload: Record<string, unknown>
): Promise<Response> {
  const jsonResponse = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

  const startTime = payload.startTime as string | undefined
  const title = (payload.title as string) || 'Consultation avec MiKL'
  const calcomUid = (payload.uid as string) ?? null
  const metadata = payload.metadata as Record<string, unknown> | undefined

  const clientId = metadata?.clientId as string | undefined
  const operatorId = metadata?.operatorId as string | undefined

  if (!clientId || !operatorId) {
    console.error('[VISIO:CALCOM_WEBHOOK] Missing clientId or operatorId in metadata')
    return jsonResponse({ error: 'Missing metadata' }, 400)
  }

  if (!startTime) {
    console.error('[VISIO:CALCOM_WEBHOOK] Missing startTime')
    return jsonResponse({ error: 'Missing startTime' }, 400)
  }

  // 1. Créer le meeting (type standard — repassé en 'coaching' par applyCoachingLogic si One+,
  //    pour rester robuste tant que la migration coaching n'est pas déployée)
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .insert({
      client_id: clientId,
      operator_id: operatorId,
      title,
      scheduled_at: startTime,
      status: 'scheduled',
      metadata: { source: 'calcom', calcomUid },
    })
    .select()
    .single()

  if (meetingError || !meeting) {
    console.error('[VISIO:CALCOM_WEBHOOK] Failed to create meeting:', meetingError)
    return jsonResponse({ error: 'Failed to create meeting' }, 500)
  }

  // 2. Coaching One+ (non bloquant)
  const coaching = await applyCoachingLogic(supabase, clientId, meeting.id as string, startTime)

  // 3. Notification client adaptée
  const when = formatDateFr(startTime)
  let notifTitle = 'RDV confirmé'
  let notifBody = `Votre rendez-vous avec MiKL est prévu le ${when}.`

  if (coaching.isCoaching && coaching.creditUsed) {
    notifTitle = 'Séance de coaching confirmée'
    notifBody =
      `Ta séance de coaching avec MiKL est prévue le ${when}. ` +
      `Elle est incluse dans ton abonnement One+${coaching.balanceAfter !== null ? ` (crédits restants : ${coaching.balanceAfter})` : ''}.`
  } else if (coaching.isCoaching && coaching.billedOutOfPlan) {
    notifTitle = 'Séance de coaching confirmée'
    notifBody =
      `Ta séance de coaching avec MiKL est prévue le ${when}. ` +
      `Séance hors forfait : 45 € ajoutés à ta prochaine facture.`
  }

  await notifyClient(supabase, clientId, notifTitle, notifBody, `/modules/visio`)

  return jsonResponse({
    data: {
      success: true,
      meetingId: meeting.id,
      coaching: coaching.isCoaching,
      creditUsed: coaching.creditUsed,
      billedOutOfPlan: coaching.billedOutOfPlan,
    },
  })
}

async function handleBookingCancelled(
  supabase: SupabaseClient,
  payload: Record<string, unknown>
): Promise<Response> {
  const jsonResponse = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

  const calcomUid = payload.uid as string | undefined
  if (!calcomUid) {
    // Anciennes réservations sans uid stocké — rien à rapprocher
    return jsonResponse({ message: 'No booking uid — nothing to cancel' })
  }

  const { data: meeting, error: findError } = await supabase
    .from('meetings')
    .select('id, client_id, type, status, scheduled_at')
    .eq('metadata->>calcomUid', calcomUid)
    .maybeSingle()

  if (findError || !meeting) {
    if (findError) {
      console.error('[VISIO:CALCOM_WEBHOOK] Cancelled booking lookup error:', findError)
    }
    return jsonResponse({ message: 'Meeting not found for cancelled booking' })
  }

  if (meeting.status === 'cancelled') {
    return jsonResponse({ message: 'Meeting already cancelled' })
  }

  const { error: cancelError } = await supabase
    .from('meetings')
    .update({ status: 'cancelled' })
    .eq('id', meeting.id)

  if (cancelError) {
    console.error('[VISIO:CALCOM_WEBHOOK] Failed to cancel meeting:', cancelError)
    return jsonResponse({ error: 'Failed to cancel meeting' }, 500)
  }

  // Coaching : recréditer la séance débitée OU annuler l'item hors forfait (non bloquant)
  let recredited = false
  if (meeting.type === 'coaching' && meeting.client_id) {
    try {
      const { data: ledgerRows, error: ledgerReadError } = await supabase
        .from('coaching_credit_ledger')
        .select('id, reason')
        .eq('meeting_id', meeting.id)

      if (ledgerReadError) {
        console.error('[VISIO:CALCOM_WEBHOOK] Ledger read error on cancel (non-blocking):', ledgerReadError)
      } else {
        const wasDebited = (ledgerRows ?? []).some((r) => r.reason === 'session_booked')
        const alreadyRecredited = (ledgerRows ?? []).some((r) => r.reason === 'session_cancelled')

        if (wasDebited && !alreadyRecredited) {
          const { error: recreditError } = await supabase.from('coaching_credit_ledger').insert({
            client_id: meeting.client_id,
            delta: 1,
            reason: 'session_cancelled',
            meeting_id: meeting.id,
            created_by: 'calcom-webhook',
          })
          if (recreditError) {
            console.error('[VISIO:CALCOM_WEBHOOK] Recredit insert error (non-blocking):', recreditError)
          } else {
            recredited = true
          }
        } else if (!wasDebited) {
          // Séance hors forfait → annuler l'item facturable en attente
          const { error: billableCancelError } = await supabase
            .from('billable_items')
            .update({ status: 'cancelled' })
            .eq('meeting_id', meeting.id)
            .eq('status', 'pending')
          if (billableCancelError) {
            console.error('[VISIO:CALCOM_WEBHOOK] Billable item cancel error (non-blocking):', billableCancelError)
          }
        }
      }
    } catch (err) {
      console.error('[VISIO:CALCOM_WEBHOOK] Cancel coaching logic error (non-blocking):', err)
    }
  }

  const when = meeting.scheduled_at ? formatDateFr(meeting.scheduled_at as string) : null
  const body = recredited
    ? `Ta séance de coaching${when ? ` du ${when}` : ''} a été annulée. Le crédit utilisé t'a été rendu.`
    : `Votre rendez-vous${when ? ` du ${when}` : ''} avec MiKL a été annulé.`

  if (meeting.client_id) {
    await notifyClient(supabase, meeting.client_id as string, 'RDV annulé', body, '/modules/visio')
  }

  return jsonResponse({ data: { success: true, meetingId: meeting.id, recredited } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  function jsonResponse(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const webhookSecret = Deno.env.get('CALCOM_WEBHOOK_SECRET')
  if (!webhookSecret) {
    console.error('[VISIO:CALCOM_WEBHOOK] Missing CALCOM_WEBHOOK_SECRET')
    return jsonResponse({ error: 'Server configuration error' }, 500)
  }

  const rawBody = await req.text()
  const signature = req.headers.get('x-cal-signature-256')
  if (!signature) {
    console.error('[VISIO:CALCOM_WEBHOOK] Missing webhook signature header')
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const isValid = await verifyCalcomSignature(rawBody, signature, webhookSecret)
  if (!isValid) {
    console.error('[VISIO:CALCOM_WEBHOOK] Invalid webhook signature')
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(rawBody)
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const payload = event.payload as Record<string, unknown> | undefined
  if (!payload) {
    return jsonResponse({ error: 'Missing payload' }, 400)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    if (event.triggerEvent === 'BOOKING_CREATED') {
      return await handleBookingCreated(supabase, payload)
    }
    if (event.triggerEvent === 'BOOKING_CANCELLED') {
      return await handleBookingCancelled(supabase, payload)
    }
    return jsonResponse({ message: 'Event ignored' })
  } catch (err) {
    console.error('[VISIO:CALCOM_WEBHOOK] Unexpected error:', err)
    return jsonResponse({ error: 'Internal error' }, 500)
  }
})
