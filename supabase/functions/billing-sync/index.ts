// Story 11.2 — Edge Function : billing-sync
// Cron toutes les 5 minutes via pg_cron.
// Polling incrémental des changelogs Pennylane → UPSERT billing_sync → Realtime.
// Runtime : Deno (pas de require, pas d'imports workspace)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_CONSECUTIVE_ERRORS = 3
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
): Promise<{ ids: string[]; deleteIds: string[]; rateLimited: boolean; error: boolean }> {
  const ids: string[] = []
  const deleteIds: string[] = []
  let cursor: string | undefined = undefined
  let hasMore = true
  let rateLimited = false
  let error = false

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

  return { ids, deleteIds, rateLimited, error }
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

// ── UPSERT billing_sync ───────────────────────────────────────────────────────

async function upsertInvoices(
  supabase: SupabaseClient,
  invoices: PennylaneInvoice[]
): Promise<number> {
  if (invoices.length === 0) return 0

  const rows = invoices.map((inv) => ({
    entity_type: 'invoice' as EntityType,
    pennylane_id: inv.id,
    status: inv.status,
    data: inv as unknown as Record<string, unknown>,
    amount: Math.round(inv.amount * 100), // stocker en centimes
    last_synced_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('billing_sync')
    .upsert(rows, { onConflict: 'entity_type,pennylane_id' })

  if (error) {
    console.error('[BILLING:SYNC] upsertInvoices error', error)
    return 0
  }

  return rows.length
}

async function upsertCustomers(
  supabase: SupabaseClient,
  customers: PennylaneCustomer[]
): Promise<number> {
  if (customers.length === 0) return 0

  const rows = customers.map((c) => ({
    entity_type: 'customer' as EntityType,
    pennylane_id: c.id,
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

async function notifyOperatorIfNeeded(
  supabase: SupabaseClient,
  state: BillingSyncState
): Promise<void> {
  if (state.consecutive_errors < MAX_CONSECUTIVE_ERRORS) return

  // Trouver le user opérateur pour la notification
  const { data: operators } = await supabase
    .from('operators')
    .select('auth_user_id')
    .limit(1)

  if (!operators || operators.length === 0) return

  const operatorUserId = operators[0].auth_user_id

  await supabase.from('notifications').insert({
    user_id: operatorUserId,
    type: 'billing_sync_alert',
    title: 'Alerte — synchronisation facturation en erreur',
    content: `La synchronisation Pennylane échoue depuis ${MAX_CONSECUTIVE_ERRORS} cycles consécutifs.`,
    link: '/hub/facturation',
  })
}

// ── Sync a single entity type (changelog → batch fetch → upsert) ─────────────

interface SyncEntityResult {
  synced: number
  rateLimited: boolean
  error: boolean
}

async function syncEntityType(
  supabase: SupabaseClient,
  entityType: EntityType,
  changelogPath: string,
  state: BillingSyncState,
  apiToken: string,
  targetClientId: string | null
): Promise<SyncEntityResult> {
  const { ids, deleteIds, rateLimited, error: changelogError } =
    await fetchChangelog(changelogPath, state.last_sync_at, apiToken)

  if (rateLimited) {
    return { synced: 0, rateLimited: true, error: false }
  }

  if (changelogError) {
    return { synced: 0, rateLimited: false, error: true }
  }

  let entities: PennylaneInvoice[] | PennylaneCustomer[] = []
  let upserted = 0

  if (entityType === 'invoice') {
    entities = await batchFetchInvoices(ids, apiToken)
    // Filtrer par client_id si targetClientId est fourni (AC #5)
    const filtered = targetClientId
      ? (entities as PennylaneInvoice[]).filter((inv) => inv.customer_id === targetClientId)
      : entities as PennylaneInvoice[]
    upserted = await upsertInvoices(supabase, filtered)
  } else if (entityType === 'customer') {
    entities = await batchFetchCustomers(ids, apiToken)
    // Filtrer par customer ID si targetClientId est fourni (AC #5)
    const filtered = targetClientId
      ? (entities as PennylaneCustomer[]).filter((c) => c.id === targetClientId)
      : entities as PennylaneCustomer[]
    upserted = await upsertCustomers(supabase, filtered)
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
        // Résoudre le foxeo client_id en pennylane_customer_id
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

    const entityConfigs: { type: EntityType; changelogPath: string }[] = [
      { type: 'invoice', changelogPath: '/changelogs/customer_invoices' },
      { type: 'customer', changelogPath: '/changelogs/customers' },
    ]

    for (const { type, changelogPath } of entityConfigs) {
      const state = stateMap.get(type)
      if (!state) continue

      const result = await syncEntityType(
        supabase, type, changelogPath, state, apiToken, targetClientId
      )

      if (result.rateLimited || result.error) {
        // Incrémenter les erreurs uniquement pour CE type d'entité (H2 fix)
        const errMsg = result.rateLimited
          ? 'Rate limited by Pennylane API (429)'
          : 'Changelog fetch error'
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
