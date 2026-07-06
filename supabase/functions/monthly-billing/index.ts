// Chantier Élio Hub / Coaching One+ (2026-07-06) — Edge Function : monthly-billing
// Cron le 1er du mois (voir README.md + docs/prod-checklist.md).
// Runtime : Deno (pas de require, pas d'imports workspace).
//
// Deux jobs, exécutés en service_role :
//   ① Accrual coaching : chaque client One+ actif reçoit +coaching_monthly_credits
//      dans coaching_credit_ledger (reason 'monthly_accrual'). Idempotent : pas de
//      ré-accrual si un accrual existe déjà pour le mois courant.
//   ② Facturation des séances hors forfait : les billable_items status='pending'
//      du mois écoulé → UNE facture Pennylane par client (pattern send-lab-invoice)
//      + mirror billing_sync AVEC client_id + items passés en 'invoiced'
//      + notification client (type 'payment'). Un échec client ne bloque pas les autres.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  startOfCurrentMonthISO,
  coachingInvoiceLabel,
  groupItemsByClient,
  sumAmountCents,
  buildCoachingInvoiceLines,
  type PendingBillableItem,
} from './monthly-billing-logic.ts'

// ── Constants ─────────────────────────────────────────────────────────────────

const PENNYLANE_BASE_URL =
  Deno.env.get('PENNYLANE_API_URL') ?? 'https://app.pennylane.com/api/external/v2'
const API_2026_HEADER = { 'X-Use-2026-API-Changes': 'true' }
const COACHING_INVOICE_TAG = '[FOXEO_COACHING]'

// ── Pennylane API helper (fetch natif Deno) ───────────────────────────────────

async function pennylanePost<T>(
  path: string,
  body: Record<string, unknown>,
  apiToken: string
): Promise<{ data: T | null; error?: string }> {
  const res = await fetch(`${PENNYLANE_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...API_2026_HEADER,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    return { data: null, error: `HTTP ${res.status}: ${text}` }
  }

  const json = await res.json() as T
  return { data: json }
}

// ── Logging erreurs (même pattern que billing-sync) ───────────────────────────

async function logError(
  supabase: SupabaseClient,
  message: string,
  details: unknown
): Promise<void> {
  await supabase.from('activity_logs').insert({
    type: 'monthly_billing_error',
    metadata: { message, details },
  })
}

// ── Job ① — Accrual mensuel des crédits coaching (clients One+ actifs) ────────

interface AccrualResult {
  accrued: number
  skipped: number
  errors: number
}

async function runCoachingAccrual(
  supabase: SupabaseClient,
  monthStartIso: string
): Promise<AccrualResult> {
  const result: AccrualResult = { accrued: 0, skipped: 0, errors: 0 }

  // Clients One+ dont le client n'est pas archivé (status = active)
  const { data: configs, error: configsError } = await supabase
    .from('client_configs')
    .select('client_id, coaching_monthly_credits, clients!inner(status)')
    .eq('elio_tier', 'one_plus')
    .eq('clients.status', 'active')

  if (configsError) {
    console.error('[MONTHLY:BILLING] accrual — client_configs query error', configsError)
    await logError(supabase, 'Accrual: client_configs query failed', configsError)
    result.errors++
    return result
  }

  for (const cfg of configs ?? []) {
    try {
      const clientId = cfg.client_id as string
      const rawCredits = (cfg as Record<string, unknown>).coaching_monthly_credits
      const credits = typeof rawCredits === 'number' ? rawCredits : 1

      if (credits <= 0) {
        result.skipped++
        continue
      }

      // Idempotence : un accrual existe-t-il déjà pour le mois courant ?
      const { data: existing, error: existingError } = await supabase
        .from('coaching_credit_ledger')
        .select('id')
        .eq('client_id', clientId)
        .eq('reason', 'monthly_accrual')
        .gte('created_at', monthStartIso)
        .limit(1)

      if (existingError) {
        console.error('[MONTHLY:BILLING] accrual — ledger check error', clientId, existingError)
        result.errors++
        continue
      }

      if (existing && existing.length > 0) {
        result.skipped++
        continue
      }

      // service_role → insert sans .select() (convention projet)
      const { error: insertError } = await supabase.from('coaching_credit_ledger').insert({
        client_id: clientId,
        delta: credits,
        reason: 'monthly_accrual',
        created_by: 'monthly-billing',
      })

      if (insertError) {
        console.error('[MONTHLY:BILLING] accrual — insert error', clientId, insertError)
        result.errors++
        continue
      }

      result.accrued++
    } catch (err) {
      console.error('[MONTHLY:BILLING] accrual — unexpected error', err)
      result.errors++
    }
  }

  return result
}

// ── Job ② — Facturation des séances hors forfait (billable_items pending) ─────

interface InvoicingResult {
  invoicedClients: number
  invoicedItems: number
  errors: number
}

interface ClientRow {
  id: string
  name: string | null
  auth_user_id: string | null
  pennylane_customer_id: string | null
}

async function invoiceClientItems(
  supabase: SupabaseClient,
  clientId: string,
  items: PendingBillableItem[],
  invoiceLabel: string,
  apiToken: string
): Promise<{ invoiced: boolean; error?: string }> {
  // Récupérer le client (nom, auth user, compte Pennylane)
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name, auth_user_id, pennylane_customer_id')
    .eq('id', clientId)
    .maybeSingle()

  if (clientError || !client) {
    return { invoiced: false, error: `Client introuvable: ${clientError?.message ?? 'no row'}` }
  }

  const clientRow = client as ClientRow
  const pennylaneCustomerId = clientRow.pennylane_customer_id

  // Pas d'auto-création de compte Pennylane dans un cron : on saute et on trace
  // (le compte est normalement créé par les flows opérateur — devis, abo, facture Lab)
  if (!pennylaneCustomerId || isNaN(parseInt(pennylaneCustomerId, 10))) {
    return {
      invoiced: false,
      error: `pennylane_customer_id absent ou corrompu ("${pennylaneCustomerId}")`,
    }
  }

  // Dates (pattern send-lab-invoice : échéance +30 jours)
  const nowIso = new Date().toISOString()
  const date = nowIso.split('T')[0]
  const deadlineDate = new Date()
  deadlineDate.setDate(deadlineDate.getDate() + 30)
  const deadline = deadlineDate.toISOString().split('T')[0]

  // POST /customer_invoices — V2 : N lignes de 45 € (une par séance)
  const invoiceResult = await pennylanePost<Record<string, unknown>>(
    '/customer_invoices',
    {
      customer_id: parseInt(pennylaneCustomerId, 10),
      date,
      deadline,
      invoice_lines: buildCoachingInvoiceLines(items),
      pdf_invoice_free_text: `${COACHING_INVOICE_TAG} ${invoiceLabel}`,
    },
    apiToken
  )

  if (invoiceResult.error || !invoiceResult.data) {
    return { invoiced: false, error: invoiceResult.error ?? 'Empty Pennylane response' }
  }

  // Réponse V2 : wrappée { customer_invoice: { id } } ou directe { id }
  const raw = invoiceResult.data
  const createdInvoice =
    (raw.customer_invoice as Record<string, unknown> | undefined) ?? raw
  const invoiceId = String(createdInvoice.id)
  const totalCents = sumAmountCents(items)

  // Envoi email Pennylane — best-effort, non bloquant (pattern send-lab-invoice)
  const emailResult = await pennylanePost(
    `/customer_invoices/${invoiceId}/send_by_email`,
    {},
    apiToken
  )
  if (emailResult.error) {
    console.warn('[MONTHLY:BILLING] send_by_email failed (non-blocking):', emailResult.error)
  }

  // Mirror billing_sync AVEC client_id (sinon invisible pour le client — RLS)
  const { error: syncError } = await supabase.from('billing_sync').upsert(
    {
      entity_type: 'invoice',
      pennylane_id: invoiceId,
      client_id: clientId,
      status: 'pending',
      amount: totalCents,
      data: {
        is_coaching_invoice: true,
        label: invoiceLabel,
        billable_item_ids: items.map((i) => i.id),
      },
      last_synced_at: nowIso,
    },
    { onConflict: 'entity_type,pennylane_id' }
  )
  if (syncError) {
    console.error('[MONTHLY:BILLING] billing_sync mirror error', syncError)
  }

  // Passer les items en invoiced (garde .eq status pending — pas de double facturation)
  const { error: updateError } = await supabase
    .from('billable_items')
    .update({
      status: 'invoiced',
      pennylane_invoice_id: invoiceId,
      invoiced_at: nowIso,
    })
    .in('id', items.map((i) => i.id))
    .eq('status', 'pending')

  if (updateError) {
    // Facture créée mais items non marqués → à corriger manuellement, on trace fort
    console.error('[MONTHLY:BILLING] billable_items update error', updateError)
    await logError(supabase, 'Facture créée mais billable_items non passés en invoiced', {
      client_id: clientId,
      pennylane_invoice_id: invoiceId,
      item_ids: items.map((i) => i.id),
      error: updateError,
    })
  }

  // Notification client (recipient_id = auth_user_id, type 'payment', title NOT NULL,
  // insert service_role SANS .select())
  if (clientRow.auth_user_id) {
    const totalEuros = (totalCents / 100).toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    })
    const { error: notifError } = await supabase.from('notifications').insert({
      type: 'payment',
      title: invoiceLabel,
      body: `${items.length} séance${items.length > 1 ? 's' : ''} de coaching hors forfait — ${totalEuros}. La facture vous a été envoyée.`,
      recipient_type: 'client',
      recipient_id: clientRow.auth_user_id,
      link: '/modules/facturation',
    })
    if (notifError) {
      console.warn('[MONTHLY:BILLING] notification insert failed', notifError)
    }
  }

  // Activity log
  await supabase.from('activity_logs').insert({
    actor_type: 'system',
    action: 'coaching_invoice_created',
    entity_type: 'invoice',
    metadata: {
      pennylane_invoice_id: invoiceId,
      client_id: clientId,
      items_count: items.length,
      amount_cents: totalCents,
      label: invoiceLabel,
    },
  })

  console.info(
    `[MONTHLY:BILLING] Invoice ${invoiceId} created for client ${clientRow.name ?? clientId} (${items.length} items)`
  )

  return { invoiced: true }
}

async function runCoachingInvoicing(
  supabase: SupabaseClient,
  monthStartIso: string,
  invoiceLabel: string,
  apiToken: string
): Promise<InvoicingResult> {
  const result: InvoicingResult = { invoicedClients: 0, invoicedItems: 0, errors: 0 }

  // Items pending du mois écoulé (créés AVANT le 1er du mois courant)
  const { data: pendingItems, error: itemsError } = await supabase
    .from('billable_items')
    .select('id, client_id, label, amount_cents')
    .eq('status', 'pending')
    .lt('created_at', monthStartIso)

  if (itemsError) {
    console.error('[MONTHLY:BILLING] billable_items query error', itemsError)
    await logError(supabase, 'Invoicing: billable_items query failed', itemsError)
    result.errors++
    return result
  }

  const grouped = groupItemsByClient((pendingItems ?? []) as PendingBillableItem[])

  for (const [clientId, items] of grouped) {
    try {
      const clientResult = await invoiceClientItems(
        supabase,
        clientId,
        items,
        invoiceLabel,
        apiToken
      )

      if (clientResult.invoiced) {
        result.invoicedClients++
        result.invoicedItems += items.length
      } else {
        result.errors++
        await logError(supabase, `Invoicing failed for client ${clientId}`, {
          client_id: clientId,
          item_ids: items.map((i) => i.id),
          error: clientResult.error,
        })
      }
    } catch (err) {
      // Un échec client ne bloque pas les autres
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('[MONTHLY:BILLING] unexpected error for client', clientId, errMsg)
      result.errors++
      await logError(supabase, `Invoicing crashed for client ${clientId}`, {
        client_id: clientId,
        error: errMsg,
      })
    }
  }

  return result
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (_req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const apiToken = Deno.env.get('PENNYLANE_API_TOKEN')
    if (!apiToken) {
      console.error('[MONTHLY:BILLING] Missing PENNYLANE_API_TOKEN')
      return new Response('Missing API token', { status: 500 })
    }

    const now = new Date()
    const monthStartIso = startOfCurrentMonthISO(now)
    const invoiceLabel = coachingInvoiceLabel(now)

    // Job ① — Accrual coaching One+
    const accrual = await runCoachingAccrual(supabase, monthStartIso)

    // Job ② — Facturation des séances hors forfait du mois écoulé
    const invoicing = await runCoachingInvoicing(supabase, monthStartIso, invoiceLabel, apiToken)

    const summary = {
      accrual,
      invoicing,
      monthStart: monthStartIso,
      invoiceLabel,
      timestamp: new Date().toISOString(),
    }

    console.info('[MONTHLY:BILLING] Run complete', JSON.stringify(summary))

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[MONTHLY:BILLING] Unhandled error', errMsg)
    await logError(supabase, 'Unhandled error in monthly-billing', { error: errMsg })

    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
