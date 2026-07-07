// Story 11.2 — Edge Function : billing-sync
// Story 11.4 — Detection overdue + alertes paiement
// Cron toutes les 5 minutes via pg_cron.
// Polling incrémental des changelogs Pennylane → UPSERT billing_sync → Realtime.
// Runtime : Deno (pas de require, pas d'imports workspace)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  normalizeCustomerId,
  buildCustomerClientMap,
  resolveClientId,
  extractSubscriptionCustomerId,
  computeSubscriptionAmountCents,
  type ClientLookupRow,
  type PennylaneSubscriptionApi,
} from './sync-logic.ts'

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_CONSECUTIVE_ERRORS = 3
const CONSECUTIVE_UNPAID_THRESHOLD = 3 // Story 11.4 — alerte critique
const BATCH_SIZE = 100
const PENNYLANE_BASE_URL = 'https://app.pennylane.com/api/external/v2'
const API_2026_HEADER = { 'X-Use-2026-API-Changes': 'true' }

// ── Types locaux (pas d'import workspace en Edge Function) ────────────────────

type EntityType = 'invoice' | 'customer' | 'quote' | 'subscription'

interface BillingSyncState {
  entity_type: EntityType
  last_sync_at: string
  consecutive_errors: number
}

interface ChangelogEntry {
  id: string
  operation: 'insert' | 'update' | 'delete'
}

interface ChangelogResponse {
  changelogs: ChangelogEntry[]
  has_more: boolean
  next_cursor?: string
}

interface PennylaneInvoice {
  id: string
  customer_id: string
  invoice_number: string
  status: string
  amount: number
  date: string
  deadline: string
  currency: string
  remaining_amount: number
  pdf_invoice_free_text: string | null
  file_url: string | null
  created_at: string
  updated_at: string
}

interface PennylaneCustomer {
  id: string
  name: string
  emails: string[]
  created_at: string
  updated_at: string
}

// ── Pennylane API helper (fetch natif Deno) ───────────────────────────────────

async function pennylaneGet<T>(
  path: string,
  apiToken: string
): Promise<{ data: T | null; retryAfter?: number; error?: string }> {
  const url = `${PENNYLANE_BASE_URL}${path}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...API_2026_HEADER,
    },
  })

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('retry-after') ?? '60', 10)
    return { data: null, retryAfter }
  }

  if (!res.ok) {
    const text = await res.text()
    return { data: null, error: `HTTP ${res.status}: ${text}` }
  }

  const json = await res.json() as T
  return { data: json }
}

// ── Fetch changelog avec pagination cursor ────────────────────────────────────

async function fetchChangelog(
  entityPath: string,
  lastSyncAt: string,
  apiToken: string
): Promise<{ ids: string[]; deleteIds: string[]; rateLimited: boolean; error: boolean; errorDetail?: string }> {
  const ids: string[] = []
  const deleteIds: string[] = []
  let cursor: string | undefined = undefined
  let hasMore = true
  let rateLimited = false
  let error = false
  let errorDetail: string | undefined

  while (hasMore) {
    const params = new URLSearchParams()
    if (!cursor) {
      // Première page : filtrer par date
      params.set('start_date', lastSyncAt)
    } else {
      // Pages suivantes : utiliser cursor (ne pas mixer avec start_date)
      params.set('cursor', cursor)
    }
    params.set('per_page', '1000')

    const path = `${entityPath}?${params.toString()}`
    const result = await pennylaneGet<ChangelogResponse>(path, apiToken)

    if (result.retryAfter !== undefined) {
      rateLimited = true
      break
    }

    if (result.error || !result.data) {
      console.error('[BILLING:SYNC] fetchChangelog error on', entityPath, result.error)
      error = true
      errorDetail = result.error?.slice(0, 500)
      break
    }

    for (const entry of result.data.changelogs) {
      if (entry.operation === 'delete') {
        deleteIds.push(entry.id)
      } else {
        ids.push(entry.id)
      }
    }

    hasMore = result.data.has_more
    cursor = result.data.next_cursor
  }

  return { ids, deleteIds, rateLimited, error, errorDetail }
}

// ── Batch fetch d'entités par IDs ─────────────────────────────────────────────

async function batchFetchInvoices(
  ids: string[],
  apiToken: string
): Promise<PennylaneInvoice[]> {
  const results: PennylaneInvoice[] = []

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE)
    const filterJson = JSON.stringify([{ field: 'id', operator: 'in', value: batch }])
    const params = new URLSearchParams({ filter: filterJson })

    const result = await pennylaneGet<{ customer_invoices: PennylaneInvoice[] }>(
      `/customer_invoices?${params.toString()}`,
      apiToken
    )

    if (result.data?.customer_invoices) {
      results.push(...result.data.customer_invoices)
    }
  }

  return results
}

async function batchFetchCustomers(
  ids: string[],
  apiToken: string
): Promise<PennylaneCustomer[]> {
  const results: PennylaneCustomer[] = []

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE)
    const filterJson = JSON.stringify([{ field: 'id', operator: 'in', value: batch }])
    const params = new URLSearchParams({ filter: filterJson })

    const result = await pennylaneGet<{ customers: PennylaneCustomer[] }>(
      `/customers?${params.toString()}`,
      apiToken
    )

    if (result.data?.customers) {
      results.push(...result.data.customers)
    }
  }

  return results
}

// ── Résolution client_id (chantier 2026-07-06) ────────────────────────────────
// Toutes les rows billing_sync doivent porter client_id quand le customer
// Pennylane correspond à un client MonprojetPro — sinon les rows sont invisibles
// pour le client (RLS billing_sync_select_owner) et pour les hooks filtrés.
// Cache Map par run pour éviter les requêtes répétées.

class ClientResolver {
  private cache = new Map<string, string | null>()

  constructor(private supabase: SupabaseClient) {}

  /** Résout un lot de customer ids Pennylane → Map(customerId → clients.id | null). */
  async resolveMany(
    customerIds: Array<string | number | null | undefined>
  ): Promise<Map<string, string | null>> {
    const wanted = [
      ...new Set(
        customerIds
          .map(normalizeCustomerId)
          .filter((id): id is string => id !== null)
      ),
    ]

    const missing = wanted.filter((id) => !this.cache.has(id))
    if (missing.length > 0) {
      const { data, error } = await this.supabase
        .from('clients')
        .select('id, pennylane_customer_id')
        .in('pennylane_customer_id', missing)

      if (error) {
        console.error('[BILLING:SYNC] ClientResolver query error', error)
      }

      const found = buildCustomerClientMap((data ?? []) as ClientLookupRow[])
      // Cache aussi les miss (null) pour ne pas re-requêter dans le même run
      for (const id of missing) {
        this.cache.set(id, found.get(id) ?? null)
      }
    }

    const result = new Map<string, string | null>()
    for (const id of wanted) {
      result.set(id, this.cache.get(id) ?? null)
    }
    return result
  }
}

// ── Pure helpers Lab invoice (Story 11.6) ────────────────────────────────────
// Dupliqués ici depuis packages/modules/facturation/utils/billing-sync-logic.ts
// (Deno ne peut pas importer les packages workspace)

const LAB_INVOICE_TAG = '[FOXEO_LAB]'
const LAB_AMOUNT_CENTS = 19900

function isLabInvoice(pdfFreeText: string | null | undefined): boolean {
  return typeof pdfFreeText === 'string' && pdfFreeText.includes(LAB_INVOICE_TAG)
}

function shouldActivateLabAccess(inv: PennylaneInvoice): boolean {
  return inv.status === 'paid' && isLabInvoice(inv.pdf_invoice_free_text)
}

// ── Pure helpers overdue (Story 11.4) ────────────────────────────────────────
// Dupliqués ici depuis packages/modules/facturation/utils/billing-sync-overdue-logic.ts
// (Deno ne peut pas importer les packages workspace)

function isInvoiceOverdue(status: string, deadline: string | null | undefined, today: string): boolean {
  return status === 'unpaid' && !!deadline && deadline < today
}

function getConsecutiveUnpaidCount(data: Record<string, unknown>): number {
  const count = data.consecutive_unpaid_count
  return typeof count === 'number' ? count : 0
}

function shouldSendCriticalAlert(count: number): boolean {
  return count >= CONSECUTIVE_UNPAID_THRESHOLD
}

// ── UPSERT billing_sync avec détection overdue ────────────────────────────────

interface ExistingInvoiceState {
  pennylane_id: string
  status: string
  data: Record<string, unknown>
}

interface OverdueHandlingResult {
  upserted: number
  newlyOverdue: Array<{ inv: PennylaneInvoice; consecutiveCount: number }>
  paidFromOverdue: Array<{ inv: PennylaneInvoice }>
  labInvoicesPaid: Array<{ inv: PennylaneInvoice }>
}

async function upsertInvoices(
  supabase: SupabaseClient,
  invoices: PennylaneInvoice[],
  resolver: ClientResolver
): Promise<OverdueHandlingResult> {
  if (invoices.length === 0) return { upserted: 0, newlyOverdue: [], paidFromOverdue: [], labInvoicesPaid: [] }

  const now = new Date()
  const today = now.toISOString().split('T')[0]

  // Résolution pennylane customer_id → clients.id (chantier 2026-07-06)
  const clientIdMap = await resolver.resolveMany(invoices.map((i) => i.customer_id))

  // 1. Pré-UPSERT: lire l'état actuel de ces factures dans billing_sync
  const { data: existingRows } = await supabase
    .from('billing_sync')
    .select('pennylane_id, status, data')
    .eq('entity_type', 'invoice')
    .in('pennylane_id', invoices.map((i) => i.id))

  const existingMap = new Map<string, ExistingInvoiceState>(
    (existingRows ?? []).map((r) => [
      r.pennylane_id,
      { pennylane_id: r.pennylane_id, status: r.status, data: r.data as Record<string, unknown> },
    ])
  )

  const newlyOverdue: Array<{ inv: PennylaneInvoice; consecutiveCount: number }> = []
  const paidFromOverdue: Array<{ inv: PennylaneInvoice }> = []
  const labInvoicesPaid: Array<{ inv: PennylaneInvoice }> = []

  // 2. Construire les lignes avec détection overdue
  const rows = invoices.map((inv) => {
    const currentEntry = existingMap.get(inv.id)
    const currentData = currentEntry?.data ?? {}
    const currentStatus = currentEntry?.status

    const overdue = isInvoiceOverdue(inv.status, inv.deadline, today)
    const wasAlreadyOverdue = currentStatus === 'overdue'
    const isPaidNow = inv.status === 'paid'
    const wasPreviouslyOverdueOrUnpaid =
      currentStatus === 'overdue' || currentStatus === 'unpaid'

    let finalStatus = inv.status
    let mergedData: Record<string, unknown> = inv as unknown as Record<string, unknown>

    if (overdue) {
      const newCount = getConsecutiveUnpaidCount(currentData) + 1
      finalStatus = 'overdue'
      mergedData = { ...inv as unknown as Record<string, unknown>, consecutive_unpaid_count: newCount }
      if (!wasAlreadyOverdue) {
        newlyOverdue.push({ inv, consecutiveCount: newCount })
      }
    } else if (isPaidNow && wasPreviouslyOverdueOrUnpaid) {
      // Transition vers payé depuis un état d'impayé — reset compteur
      mergedData = { ...inv as unknown as Record<string, unknown>, consecutive_unpaid_count: 0 }
      paidFromOverdue.push({ inv })
    }

    // Détection paiement Lab (Story 11.6)
    if (shouldActivateLabAccess(inv) && currentStatus !== 'paid') {
      labInvoicesPaid.push({ inv })
    }

    return {
      entity_type: 'invoice' as EntityType,
      pennylane_id: inv.id,
      client_id: resolveClientId(clientIdMap, inv.customer_id),
      status: finalStatus,
      data: mergedData,
      amount: Math.round(inv.amount * 100),
      last_synced_at: now.toISOString(),
    }
  })

  // 3. UPSERT
  const { error } = await supabase
    .from('billing_sync')
    .upsert(rows, { onConflict: 'entity_type,pennylane_id' })

  if (error) {
    console.error('[BILLING:SYNC] upsertInvoices error', error)
    return { upserted: 0, newlyOverdue: [], paidFromOverdue: [], labInvoicesPaid: [] }
  }

  return { upserted: rows.length, newlyOverdue, paidFromOverdue, labInvoicesPaid }
}

// ── Notifications et logs pour les factures overdue ───────────────────────────

async function handleOverdueNotifications(
  supabase: SupabaseClient,
  newlyOverdue: Array<{ inv: PennylaneInvoice; consecutiveCount: number }>
): Promise<void> {
  if (newlyOverdue.length === 0) return

  // Récupérer l'opérateur pour les notifications MiKL
  const { data: operators } = await supabase
    .from('operators')
    .select('auth_user_id')
    .limit(1)

  const operatorUserId = operators?.[0]?.auth_user_id ?? null

  // Batch-resolve clients from pennylane_customer_ids (avoid N+1)
  const customerIds = [...new Set(newlyOverdue.map((o) => o.inv.customer_id))]
  const { data: clients } = await supabase
    .from('clients')
    .select('auth_user_id, name, pennylane_customer_id')
    .in('pennylane_customer_id', customerIds)

  const clientMap = new Map(
    (clients ?? []).map((c) => [c.pennylane_customer_id, c])
  )

  for (const { inv, consecutiveCount } of newlyOverdue) {
    const amountFormatted = `${(inv.amount ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${inv.currency ?? 'EUR'}`

    const client = clientMap.get(inv.customer_id) ?? null

    // Notification MiKL
    if (operatorUserId) {
      const title = shouldSendCriticalAlert(consecutiveCount)
        ? `Alerte critique — ${client?.name ?? inv.customer_id} : ${consecutiveCount} impayés consécutifs`
        : `Échec paiement — ${client?.name ?? inv.customer_id}, facture ${inv.invoice_number}, ${amountFormatted}`

      await supabase.from('notifications').insert({
        recipient_type: 'operator',
        recipient_id: operatorUserId,
        type: 'billing_payment_failed',
        title,
        body: `Facture ${inv.invoice_number} — Montant : ${amountFormatted}. Deadline : ${inv.deadline ?? '—'}.`,
        link: '/hub/facturation',
      })
    }

    // Notification client
    if (client?.auth_user_id) {
      await supabase.from('notifications').insert({
        recipient_type: 'client',
        recipient_id: client.auth_user_id,
        type: 'billing_payment_failed',
        title: 'Votre paiement est en attente',
        body: `Votre paiement de ${amountFormatted} est en attente. Merci de régulariser votre situation.`,
        link: '/modules/facturation',
      })

      // Email via send-email Edge Function (si disponible)
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            template: 'payment-failed',
            data: {
              recipientName: client.name ?? 'Client',
              amount: amountFormatted,
              currency: inv.currency ?? 'EUR',
              platformUrl: Deno.env.get('APP_URL') ?? 'https://monprojet-pro.com',
              recipientType: 'client',
            },
          },
        })
      } catch {
        console.warn('[BILLING:SYNC] send-email Edge Function not available')
      }
    }

    // Activity log
    await supabase.from('activity_logs').insert({
      actor_type: 'system',
      action: 'payment_failed',
      entity_type: 'invoice',
      metadata: {
        pennylane_invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        customer_id: inv.customer_id,
        amount: inv.amount,
        deadline: inv.deadline,
        consecutive_unpaid_count: consecutiveCount,
        critical_alert: shouldSendCriticalAlert(consecutiveCount),
      },
    })

    console.info(
      `[BILLING:SYNC] Overdue invoice detected: ${inv.invoice_number}, consecutive: ${consecutiveCount}`
    )
  }
}

// ── Notifications paiement reçu ───────────────────────────────────────────────

async function handlePaidTransitionNotifications(
  supabase: SupabaseClient,
  paidFromOverdue: Array<{ inv: PennylaneInvoice }>
): Promise<void> {
  if (paidFromOverdue.length === 0) return

  // Batch-resolve clients from pennylane_customer_ids (avoid N+1)
  const customerIds = [...new Set(paidFromOverdue.map((o) => o.inv.customer_id))]
  const { data: clients } = await supabase
    .from('clients')
    .select('auth_user_id, name, pennylane_customer_id')
    .in('pennylane_customer_id', customerIds)

  const clientMap = new Map(
    (clients ?? []).map((c) => [c.pennylane_customer_id, c])
  )

  for (const { inv } of paidFromOverdue) {
    const amountFormatted = `${(inv.amount ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${inv.currency ?? 'EUR'}`

    const client = clientMap.get(inv.customer_id) ?? null

    if (client?.auth_user_id) {
      await supabase.from('notifications').insert({
        recipient_type: 'client',
        recipient_id: client.auth_user_id,
        type: 'billing_payment_received',
        title: 'Paiement reçu — merci !',
        body: `Votre paiement de ${amountFormatted} a bien été reçu.`,
        link: '/modules/facturation',
      })

      await supabase.from('activity_logs').insert({
        actor_type: 'system',
        action: 'payment_received',
        entity_type: 'invoice',
        metadata: {
          pennylane_invoice_id: inv.id,
          invoice_number: inv.invoice_number,
          amount: inv.amount,
        },
      })

      console.info(`[BILLING:SYNC] Payment received for invoice: ${inv.invoice_number}`)
    }
  }
}

// ── Activation accès Lab après paiement (Story 11.6) ─────────────────────────

async function handleLabPaymentActivations(
  supabase: SupabaseClient,
  labInvoicesPaid: Array<{ inv: PennylaneInvoice }>
): Promise<void> {
  if (labInvoicesPaid.length === 0) return

  // Récupérer l'opérateur pour notification
  const { data: operators } = await supabase
    .from('operators')
    .select('auth_user_id')
    .limit(1)
  const operatorUserId = operators?.[0]?.auth_user_id ?? null

  // Batch-resolve clients from pennylane_customer_ids
  const customerIds = [...new Set(labInvoicesPaid.map((o) => o.inv.customer_id))]
  const { data: clients } = await supabase
    .from('clients')
    .select('id, auth_user_id, name, pennylane_customer_id')
    .in('pennylane_customer_id', customerIds)

  const clientMap = new Map(
    (clients ?? []).map((c) => [c.pennylane_customer_id, c])
  )

  const now = new Date().toISOString()

  for (const { inv } of labInvoicesPaid) {
    const client = clientMap.get(inv.customer_id) ?? null
    if (!client) continue

    // Activer lab_paid sur le client
    await supabase
      .from('clients')
      .update({ lab_paid: true, lab_paid_at: now, lab_amount: LAB_AMOUNT_CENTS })
      .eq('id', client.id)

    // Notification MiKL
    if (operatorUserId) {
      await supabase.from('notifications').insert({
        recipient_type: 'operator',
        recipient_id: operatorUserId,
        type: 'lab_payment_received',
        title: `Paiement Lab reçu — ${client.name}`,
        body: `Le forfait Lab (199€) a été payé par ${client.name}. Accès Lab activé.`,
        link: '/hub/facturation',
      })
    }

    // Notification client
    if (client.auth_user_id) {
      await supabase.from('notifications').insert({
        recipient_type: 'client',
        recipient_id: client.auth_user_id,
        type: 'lab_payment_received',
        title: 'Accès Lab activé !',
        body: 'Votre paiement du forfait Lab (199€) a été reçu. Votre accès Lab est maintenant actif.',
        link: '/dashboard',
      })
    }

    // Activity log
    await supabase.from('activity_logs').insert({
      actor_type: 'system',
      action: 'lab_payment_received',
      entity_type: 'invoice',
      metadata: {
        pennylane_invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        client_id: client.id,
        amount: LAB_AMOUNT_CENTS,
      },
    })

    console.info(`[BILLING:SYNC] Lab payment received for client: ${client.name}`)
  }
}

async function upsertCustomers(
  supabase: SupabaseClient,
  customers: PennylaneCustomer[],
  resolver: ClientResolver
): Promise<number> {
  if (customers.length === 0) return 0

  // Pour un customer, le pennylane_id EST le customer id → résolution directe
  const clientIdMap = await resolver.resolveMany(customers.map((c) => c.id))

  const rows = customers.map((c) => ({
    entity_type: 'customer' as EntityType,
    pennylane_id: c.id,
    client_id: resolveClientId(clientIdMap, c.id),
    status: 'active',
    data: c as unknown as Record<string, unknown>,
    last_synced_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('billing_sync')
    .upsert(rows, { onConflict: 'entity_type,pennylane_id' })

  if (error) {
    console.error('[BILLING:SYNC] upsertCustomers error', error)
    return 0
  }

  return rows.length
}

// ── Subscriptions (chantier 2026-07-06) ───────────────────────────────────────
// ⚠️ Pennylane n'expose PAS de changelog /changelogs/billing_subscriptions dans
// l'API externe v2. On fait donc un fetch direct paginé de /billing_subscriptions
// à chaque sync (volumétrie très faible : quelques abonnements par client).
// Conséquence : pas de détection de suppression (soft delete) pour cette entité —
// un abonnement supprimé côté Pennylane doit être stoppé (status stopped/finished),
// ce qui est bien remonté par le fetch complet.

async function fetchAllSubscriptions(
  apiToken: string
): Promise<{ subs: PennylaneSubscriptionApi[]; rateLimited: boolean; error: boolean; errorDetail?: string }> {
  const subs: PennylaneSubscriptionApi[] = []
  let cursor: string | undefined = undefined
  let hasMore = true

  while (hasMore) {
    const params = new URLSearchParams({ per_page: '100' })
    if (cursor) params.set('cursor', cursor)

    const result = await pennylaneGet<Record<string, unknown>>(
      `/billing_subscriptions?${params.toString()}`,
      apiToken
    )

    if (result.retryAfter !== undefined) {
      return { subs, rateLimited: true, error: false }
    }
    if (result.error || !result.data) {
      console.error('[BILLING:SYNC] fetchAllSubscriptions error', result.error)
      return { subs, rateLimited: false, error: true, errorDetail: result.error?.slice(0, 500) }
    }

    // Le payload V2 liste sous `billing_subscriptions` (fallback `items` par prudence)
    const json = result.data
    const pageItems = (json.billing_subscriptions ?? json.items ?? []) as PennylaneSubscriptionApi[]
    subs.push(...pageItems)

    const nextCursor = json.next_cursor as string | undefined
    hasMore = Boolean(json.has_more) && Boolean(nextCursor)
    cursor = nextCursor
  }

  return { subs, rateLimited: false, error: false }
}

async function upsertSubscriptions(
  supabase: SupabaseClient,
  subscriptions: PennylaneSubscriptionApi[],
  resolver: ClientResolver
): Promise<number> {
  if (subscriptions.length === 0) return 0

  const clientIdMap = await resolver.resolveMany(
    subscriptions.map((s) => extractSubscriptionCustomerId(s))
  )

  const rows = subscriptions.map((sub) => ({
    entity_type: 'subscription' as EntityType,
    pennylane_id: String(sub.id),
    client_id: resolveClientId(clientIdMap, extractSubscriptionCustomerId(sub)),
    status: typeof sub.status === 'string' && sub.status.length > 0 ? sub.status : 'active',
    data: sub as unknown as Record<string, unknown>,
    amount: computeSubscriptionAmountCents(sub),
    last_synced_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('billing_sync')
    .upsert(rows, { onConflict: 'entity_type,pennylane_id' })

  if (error) {
    console.error('[BILLING:SYNC] upsertSubscriptions error', error)
    return 0
  }

  return rows.length
}

// ── Marquer les entités supprimées (soft delete) ──────────────────────────────

async function markDeleted(
  supabase: SupabaseClient,
  entityType: EntityType,
  pennylaneIds: string[]
): Promise<void> {
  if (pennylaneIds.length === 0) return

  const { error } = await supabase
    .from('billing_sync')
    .update({ status: 'deleted', last_synced_at: new Date().toISOString() })
    .eq('entity_type', entityType)
    .in('pennylane_id', pennylaneIds)

  if (error) {
    console.error('[BILLING:SYNC] markDeleted error', entityType, error)
  }
}

// ── Logging erreurs ───────────────────────────────────────────────────────────

async function logError(
  supabase: SupabaseClient,
  message: string,
  details: unknown
): Promise<void> {
  await supabase.from('activity_logs').insert({
    type: 'billing_sync_error',
    metadata: { message, details },
  })
}

// ── Notification MiKL (3 erreurs consécutives) ────────────────────────────────

// Cadence cron = 5 min → 288 cycles ≈ 24 h. Anti-spam (incident 2026-07-07 :
// 834 notifications en 24 h) : on notifie UNE fois au franchissement du seuil,
// puis un rappel quotidien tant que l'erreur persiste. Le compteur repasse à 0
// au premier succès, donc une rechute re-déclenche bien une alerte.
const REMINDER_EVERY_CYCLES = 288

async function notifyOperatorIfNeeded(
  supabase: SupabaseClient,
  state: BillingSyncState
): Promise<void> {
  const crossedThreshold = state.consecutive_errors === MAX_CONSECUTIVE_ERRORS
  const dailyReminder =
    state.consecutive_errors > MAX_CONSECUTIVE_ERRORS &&
    state.consecutive_errors % REMINDER_EVERY_CYCLES === 0
  if (!crossedThreshold && !dailyReminder) return

  // Trouver le user opérateur pour la notification
  const { data: operators } = await supabase
    .from('operators')
    .select('auth_user_id')
    .limit(1)

  if (!operators || operators.length === 0) return

  const operatorUserId = operators[0].auth_user_id

  await supabase.from('notifications').insert({
    recipient_type: 'operator',
    recipient_id: operatorUserId,
    type: 'billing_sync_alert',
    title: 'Alerte — synchronisation facturation en erreur',
    body: `La synchronisation Pennylane (${state.entity_type}) échoue depuis ${state.consecutive_errors} cycles. Vérifie PENNYLANE_API_TOKEN dans les secrets Edge Functions Supabase.`,
    link: '/modules/facturation',
  })
}

// ── Sync a single entity type (changelog → batch fetch → upsert) ─────────────

interface SyncEntityResult {
  synced: number
  rateLimited: boolean
  error: boolean
  errorDetail?: string
}

async function syncEntityType(
  supabase: SupabaseClient,
  entityType: EntityType,
  changelogPath: string,
  state: BillingSyncState,
  apiToken: string,
  targetClientId: string | null,
  resolver: ClientResolver
): Promise<SyncEntityResult> {
  // ── Subscriptions : pas de changelog Pennylane → fetch direct paginé complet ──
  if (entityType === 'subscription') {
    const { subs, rateLimited, error, errorDetail } = await fetchAllSubscriptions(apiToken)
    if (rateLimited) return { synced: 0, rateLimited: true, error: false }
    if (error) return { synced: 0, rateLimited: false, error: true, errorDetail }

    const filtered = targetClientId
      ? subs.filter((s) => extractSubscriptionCustomerId(s) === normalizeCustomerId(targetClientId))
      : subs
    const upsertedSubs = await upsertSubscriptions(supabase, filtered, resolver)

    await supabase
      .from('billing_sync_state')
      .update({
        last_sync_at: new Date().toISOString(),
        consecutive_errors: 0,
        last_error: null,
      })
      .eq('entity_type', entityType)

    return { synced: upsertedSubs, rateLimited: false, error: false }
  }

  const { ids, deleteIds, rateLimited, error: changelogError, errorDetail } =
    await fetchChangelog(changelogPath, state.last_sync_at, apiToken)

  if (rateLimited) {
    return { synced: 0, rateLimited: true, error: false }
  }

  if (changelogError) {
    return { synced: 0, rateLimited: false, error: true, errorDetail }
  }

  let entities: PennylaneInvoice[] | PennylaneCustomer[] = []
  let upserted = 0

  if (entityType === 'invoice') {
    entities = await batchFetchInvoices(ids, apiToken)
    // Filtrer par client_id si targetClientId est fourni (AC #5)
    const filtered = targetClientId
      ? (entities as PennylaneInvoice[]).filter((inv) => inv.customer_id === targetClientId)
      : entities as PennylaneInvoice[]
    // Story 11.4 — upsertInvoices retourne maintenant les listes overdue/paid
    const invoiceResult = await upsertInvoices(supabase, filtered, resolver)
    upserted = invoiceResult.upserted
    // Traiter les notifications overdue et paiements reçus
    await handleOverdueNotifications(supabase, invoiceResult.newlyOverdue)
    await handlePaidTransitionNotifications(supabase, invoiceResult.paidFromOverdue)
    // Activer accès Lab si paiement Lab détecté (Story 11.6)
    await handleLabPaymentActivations(supabase, invoiceResult.labInvoicesPaid)
  } else if (entityType === 'customer') {
    entities = await batchFetchCustomers(ids, apiToken)
    // Filtrer par customer ID si targetClientId est fourni (AC #5)
    const filtered = targetClientId
      ? (entities as PennylaneCustomer[]).filter((c) => c.id === targetClientId)
      : entities as PennylaneCustomer[]
    upserted = await upsertCustomers(supabase, filtered, resolver)
  }

  await markDeleted(supabase, entityType, deleteIds)

  // Mettre à jour l'état de sync — success
  await supabase
    .from('billing_sync_state')
    .update({
      last_sync_at: new Date().toISOString(),
      consecutive_errors: 0,
      last_error: null,
    })
    .eq('entity_type', entityType)

  return { synced: upserted + deleteIds.length, rateLimited: false, error: false }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const apiToken = Deno.env.get('PENNYLANE_API_TOKEN')
    if (!apiToken) {
      console.error('[BILLING:SYNC] Missing PENNYLANE_API_TOKEN')
      return new Response('Missing API token', { status: 500 })
    }

    // Support invoke direct avec clientId optionnel (AC #5 — triggerBillingSync)
    // targetClientId = pennylane_customer_id pour filtrer le sync
    let targetClientId: string | null = null
    try {
      const body = await req.json() as { clientId?: string }
      if (body.clientId) {
        // Résoudre le monprojetpro client_id en pennylane_customer_id
        const { data: client } = await supabase
          .from('clients')
          .select('pennylane_customer_id')
          .eq('id', body.clientId)
          .maybeSingle()
        targetClientId = client?.pennylane_customer_id ?? null
      }
    } catch {
      // Pas de body (appel cron) → sync globale
    }

    // Charger l'état de sync
    const { data: syncStates, error: stateError } = await supabase
      .from('billing_sync_state')
      .select('entity_type, last_sync_at, consecutive_errors')

    if (stateError || !syncStates) {
      console.error('[BILLING:SYNC] Failed to load sync state', stateError)
      return new Response('Failed to load sync state', { status: 500 })
    }

    const stateMap = new Map<EntityType, BillingSyncState>(
      syncStates.map((s) => [s.entity_type as EntityType, s as BillingSyncState])
    )

    let totalSynced = 0

    // ── Sync each entity type independently ───────────────────────────────

    // Résolveur pennylane_customer_id → clients.id, partagé (cache) sur tout le run
    const resolver = new ClientResolver(supabase)

    const entityConfigs: { type: EntityType; changelogPath: string }[] = [
      { type: 'invoice', changelogPath: '/changelogs/customer_invoices' },
      { type: 'customer', changelogPath: '/changelogs/customers' },
      // subscription : pas de changelog Pennylane → fetch direct paginé
      // dans syncEntityType (changelogPath ignoré pour ce type)
      { type: 'subscription', changelogPath: '' },
    ]

    for (const { type, changelogPath } of entityConfigs) {
      const state = stateMap.get(type)
      if (!state) continue

      const result = await syncEntityType(
        supabase, type, changelogPath, state, apiToken, targetClientId, resolver
      )

      if (result.rateLimited || result.error) {
        // Incrémenter les erreurs uniquement pour CE type d'entité (H2 fix)
        const errMsg = result.rateLimited
          ? 'Rate limited by Pennylane API (429)'
          : result.errorDetail ?? 'Changelog fetch error'
        const newErrors = state.consecutive_errors + 1
        await supabase
          .from('billing_sync_state')
          .update({ consecutive_errors: newErrors, last_error: errMsg })
          .eq('entity_type', type)

        await notifyOperatorIfNeeded(supabase, { ...state, consecutive_errors: newErrors })
        await logError(supabase, `[${type}] ${errMsg}`, { timestamp: new Date().toISOString() })
      } else {
        totalSynced += result.synced
      }
    }

    const summary = {
      synced: totalSynced,
      targetClientId,
      timestamp: new Date().toISOString(),
    }

    console.info('[BILLING:SYNC] Sync complete', JSON.stringify(summary))

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    // M2 fix — top-level error handling
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[BILLING:SYNC] Unhandled error', errMsg)
    await logError(supabase, 'Unhandled error in billing-sync', { error: errMsg })

    return new Response(
      JSON.stringify({ error: 'Internal error', synced: 0 }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
