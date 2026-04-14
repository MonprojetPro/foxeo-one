// API Route: /api/webhooks/cal-com
// Reçoit les webhooks de Cal.com (bookings, cancellations, reschedules)
// BOOKING_CREATED → upsert fiche client prospect + calcom_bookings
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface CalcomAttendee {
  name: string
  email: string
  timeZone?: string
}

interface CalcomWebhookPayload {
  triggerEvent: 'BOOKING_CREATED' | 'BOOKING_CANCELLED' | 'BOOKING_RESCHEDULED'
  payload: {
    uid: string
    title: string
    description?: string
    startTime: string
    endTime: string
    attendees?: CalcomAttendee[]
    status?: string
    responses?: Record<string, { value: string | string[] | boolean }>
  }
}

// Mapping label Cal.com → project_type DB
const PROJECT_TYPE_MAP: Record<string, string> = {
  'Coaching de projet': 'coaching',
  'Développement sur mesure': 'dev',
  'Les deux': 'coaching_dev',
  'Simple échange': 'exchange',
  'Autre': 'other',
}

async function verifySignature(req: NextRequest, body: string): Promise<boolean> {
  const secret = process.env.CALCOM_WEBHOOK_SECRET
  if (!secret) return true // Si pas de secret configuré, on accepte (dev)

  const signature = req.headers.get('x-cal-signature-256')
  if (!signature) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  const expected = `sha256=${Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')}`

  return signature === expected
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()

    const valid = await verifySignature(req, body)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const webhook: CalcomWebhookPayload = JSON.parse(body)
    const { triggerEvent, payload } = webhook

    // Service role client — bypass RLS pour le webhook
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const attendee = payload.attendees?.[0]

    if (triggerEvent === 'BOOKING_CREATED') {
      // 1. Stocker le booking
      const { error: bookingError } = await supabase
        .from('calcom_bookings')
        .upsert({
          calcom_booking_id: payload.uid,
          title: payload.title,
          description: payload.description ?? null,
          start_time: payload.startTime,
          end_time: payload.endTime,
          attendee_name: attendee?.name ?? null,
          attendee_email: attendee?.email ?? null,
          status: 'confirmed',
          raw_payload: payload,
        }, { onConflict: 'calcom_booking_id' })

      if (bookingError) {
        console.error('[CALCOM_WEBHOOK] Booking insert error:', bookingError)
        return NextResponse.json({ error: 'DB error' }, { status: 500 })
      }

      // 2. Auto-créer la fiche prospect si on a un email
      if (attendee?.email) {
        // Trouver l'opérateur (MiKL — setup mono-opérateur)
        const { data: operator } = await supabase
          .from('operators')
          .select('id')
          .limit(1)
          .single()

        if (operator) {
          // Extraire les champs du formulaire Cal.com
          const responses = payload.responses ?? {}
          const companyRaw = responses['Nom de votre entreprise']?.value ?? responses['company']?.value ?? null
          const company = typeof companyRaw === 'string' ? companyRaw : null
          const projectTypeRaw = responses['Type de projet']?.value ?? null
          const projectType = typeof projectTypeRaw === 'string'
            ? (PROJECT_TYPE_MAP[projectTypeRaw] ?? 'other')
            : null

          // Décomposer le nom
          const fullName = attendee.name.trim()
          const parts = fullName.split(' ')
          const firstName = parts.length > 1 ? parts[0] : null
          const lastName = parts.length > 1 ? parts.slice(1).join(' ') : fullName

          // Upsert client (email unique par opérateur)
          const { data: existing } = await supabase
            .from('clients')
            .select('id')
            .eq('operator_id', operator.id)
            .eq('email', attendee.email)
            .maybeSingle()

          if (!existing) {
            const { data: newClient, error: clientError } = await supabase
              .from('clients')
              .insert({
                operator_id: operator.id,
                first_name: firstName,
                name: lastName,
                company: company ?? fullName,
                email: attendee.email,
                client_type: 'complet',
                status: 'prospect',
                prospect_stage: 'nouveau',
                project_type: projectType,
                lead_message: payload.description ?? null,
                // hub_seen_at NULL → badge Nouveau sur Hub
              })
              .select('id')
              .single()

            if (clientError) {
              console.error('[CALCOM_WEBHOOK] Client insert error:', clientError)
            } else if (newClient) {
              // Activity log
              await supabase.from('activity_logs').insert({
                actor_type: 'system',
                actor_id: operator.id,
                action: 'prospect_created',
                entity_type: 'client',
                entity_id: newClient.id,
                metadata: { source: 'calcom', calcom_booking_id: payload.uid },
              })

              // client_configs minimal
              await supabase.from('client_configs').insert({
                client_id: newClient.id,
                active_modules: [],
                dashboard_type: 'one',
              })
            }
          } else {
            // Client existant → mettre à jour lead_message si vide
            await supabase
              .from('clients')
              .update({
                lead_message: payload.description ?? null,
                project_type: projectType ?? undefined,
              })
              .eq('id', existing.id)
              .is('lead_message', null)
          }
        }
      }
    }

    if (triggerEvent === 'BOOKING_CANCELLED') {
      const { error } = await supabase
        .from('calcom_bookings')
        .update({ status: 'cancelled', raw_payload: payload })
        .eq('calcom_booking_id', payload.uid)

      if (error) {
        console.error('[CALCOM_WEBHOOK] Cancel error:', error)
      }
    }

    if (triggerEvent === 'BOOKING_RESCHEDULED') {
      const { error } = await supabase
        .from('calcom_bookings')
        .update({
          start_time: payload.startTime,
          end_time: payload.endTime,
          status: 'rescheduled',
          raw_payload: payload,
        })
        .eq('calcom_booking_id', payload.uid)

      if (error) {
        console.error('[CALCOM_WEBHOOK] Reschedule error:', error)
      }
    }

    return NextResponse.json({ received: true })

  } catch (err) {
    console.error('[CALCOM_WEBHOOK] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
