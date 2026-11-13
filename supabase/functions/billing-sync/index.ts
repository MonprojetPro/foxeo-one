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
  extractListItems,
  extractInvoiceCustomerId,
  isCreditNotePayload,
  mergeInvoiceData,
  extractPaidOnDate,
  needsPaidOnLookup,
  isInvoiceOverdue,
  wasUnsettled,
  type MatchedTransactionRef,
  type PaymentRef,
  type ClientLookupRow,
  type PennylaneSubscriptionApi,
} from './sync-logic.ts'

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_CONSECUTIVE_ERRORS = 3
const CONSECUTIVE_UNPAID_THRESHOLD = 3 // Story 11.4 — alerte critique
const BATCH_SIZE = 100
// Alignée sur les deux autres chemins d'accès à Pennylane
// (`facturation/config/pennylane.ts` et `monthly-billing/index.ts`), qui lisent
// tous deux `PENNYLANE_API_URL` avec ce même repli sur la production.
//
// Cette URL était écrite en dur ici, ce qui rendait la consigne de
// `prod-checklist.md` — « sandbox d'abord, prod ensuite » — intenable : on
// aurait créé les devis dans le bac à sable tout en relisant la production.
// Vérifié le 2026-09-20 : la variable vaut bien l'URL de production, donc rien
// ne change aujourd'hui. Le correctif évite que l'incohérence morde le jour où
// quelqu'un voudra réellement tester en bac à sable.
const PENNYLANE_BASE_URL =
  Deno.env.get('PENNYLANE_API_URL') ?? 'https://app.pennylane.com/api/external/v2'
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
  /** Absent en V2 — le client est sous `customer.id` (lire via extractInvoiceCustomerId) */
  customer_id?: string
  customer?: { id?: string | number } | null
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

  // Les changelogs Pennylane ont une rétention limitée : un start_date trop
  // ancien renvoie 422 « Start date is too old » (constaté après 5 mois sans
  // sync, 2026-07-07). On borne à 30 jours — au-delà, l'historique est de
  // toute façon perdu côté changelog.
  const OLDEST_START_MS = 30 * 24 * 60 * 60 * 1000
  const startDate =
    Date.now() - new Date(lastSyncAt).getTime() > OLDEST_START_MS
      ? new Date(Date.now() - OLDEST_START_MS).toISOString()
      : lastSyncAt

  while (hasMore) {
    const params = new URLSearchParams()
    if (!cursor) {
      // Première page : filtrer par date
      params.set('start_date', startDate)
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

    // L'API 2026 ne garantit pas la clé `changelogs` — formes observées : items/data.
    // Si la forme est inconnue, on remonte les clés réelles dans last_error (diagnostic).
    const payload = result.data as unknown as Record<string, unknown>
    const rawList = payload.changelogs ?? payload.items ?? payload.data
    if (!Array.isArray(rawList)) {
      console.error('[BILLING:SYNC] Unexpected changelog payload on', entityPath, Object.keys(payload))
      error = true
      errorDetail = `Unexpected changelog payload shape — keys: ${Object.keys(payload).join(', ')}`.slice(0, 500)
      break
    }

    for (const entry of rawList as ChangelogEntry[]) {
      // V2 : l'id arrive en nombre, la colonne pennylane_id est un texte
      if (entry.operation === 'delete') {
        deleteIds.push(String(entry.id))
      } else {
        ids.push(String(entry.id))
      }
    }

    hasMore = Boolean(payload.has_more)
    cursor = payload.next_cursor as string | undefined
  }

  return { ids, deleteIds, rateLimited, error, errorDetail }
}

// ── Batch fetch d'entités par IDs ─────────────────────────────────────────────

// T-083 — renvoie aussi l'erreur : avant, une reponse vide ou en echec etait
// avalee, et la synchro repondait « synced: 0 » comme si de rien n'etait.
interface BatchFetchResult<T> {
  items: T[]
  errorDetail?: string
}

async function batchFetchByIds<T>(
  resource: '/customer_invoices' | '/customers',
  legacyKey: string,
  ids: string[],
  apiToken: string
): Promise<BatchFetchResult<T>> {
  const items: T[] = []
  // Une meme facture modifiee plusieurs fois apparait plusieurs fois au changelog
  const uniqueIds = [...new Set(ids.map(String))]

  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + BATCH_SIZE)
    const filterJson = JSON.stringify([{ field: 'id', operator: 'in', value: batch }])
    const params = new URLSearchParams({ filter: filterJson, limit: String(BATCH_SIZE) })

    const result = await pennylaneGet<Record<string, unknown>>(
      `${resource}?${params.toString()}`,
      apiToken
    )

    if (result.retryAfter !== undefined) {
      return { items, errorDetail: 'Rate limited by Pennylane API (429)' }
    }
    if (result.error || !result.data) {
      return { items, errorDetail: `${resource}: ${result.error ?? 'empty response'}`.slice(0, 500) }
    }

    items.push(...extractListItems<T>(result.data, legacyKey))
  }

  // Le changelog annonce des changements mais la liste revient vide : c'est
  // exactement la panne silencieuse de T-083. On la remonte en erreur.
  if (uniqueIds.length > 0 && items.length === 0) {
    return { items, errorDetail: `${resource}: ${uniqueIds.length} id(s) annonces par le changelog, 0 recu` }
  }

  return { items }
}

// ── Date d'encaissement d'une facture payee (T-085) ───────────────────────────
//
// Deux appels AU PLUS, et seulement pour une facture qui vient de passer
// `paid` (voir `needsPaidOnLookup`) : la date ne bouge plus ensuite, la
// rechercher a chaque cycle de 5 min serait du gaspillage d'API.
//
// Un echec ici n'est PAS une erreur de synchro : la facture est deja juste,
// seule sa date d'encaissement manque. On laisse `paid_on` absent, le prochain
// cycle retentera.

async function fetchPaidOnDate(
  invoiceId: string,
  apiToken: string
): Promise<string | null> {
  const matchedRes = await pennylaneGet<Record<string, unknown>>(
    `/customer_invoices/${invoiceId}/matched_transactions?limit=100`,
    apiToken
  )
  // ⚠️ Un appel EN ECHEC n'est pas « aucune transaction rapprochee ». Se
  // rabattre sur les paiements dans ce cas figerait une date moins fiable
  // (celle de l'enregistrement chez Pennylane) sans jamais la corriger, puisque
  // `paid_on` une fois pose n'est plus recherche. On preferre rendre null : le
  // prochain cycle retentera.
  if (matchedRes.error || matchedRes.retryAfter !== undefined || !matchedRes.data) {
    console.warn('[BILLING:SYNC] matched_transactions indisponible', invoiceId, matchedRes.error)
    return null
  }
  const matched = extractListItems<MatchedTransactionRef>(matchedRes.data, 'matched_transactions')

  // Les paiements ne servent que de repli : ils ne portent pas la date de
  // l'operation bancaire, seulement celle de leur creation dans Pennylane.
  let payments: PaymentRef[] = []
  if (matched.length === 0) {
    const paymentsRes = await pennylaneGet<Record<string, unknown>>(
      `/customer_invoices/${invoiceId}/payments?limit=100`,
      apiToken
    )
    payments = extractListItems<PaymentRef>(paymentsRes.data, 'payments')
  }

  return extractPaidOnDate(matched, payments)
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

// T-083a — `isInvoiceOverdue` vit desormais dans `sync-logic.ts`, ou les tests
// l'atteignent. Elle etait ici, hors de portee : c'est exactement la ou le
// defaut « on cherche `unpaid`, Pennylane dit `late` » a pu dormir.

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
  client_id: string | null
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
  resolver: ClientResolver,
  apiToken: string
): Promise<OverdueHandlingResult> {
  // T-083 — les avoirs restent geres sous entity_type 'credit_note' (voir
  // isCreditNotePayload) : on ne les reecrit pas en facture.
  invoices = invoices.filter((inv) => !isCreditNotePayload(inv))
  if (invoices.length === 0) return { upserted: 0, newlyOverdue: [], paidFromOverdue: [], labInvoicesPaid: [] }

  const now = new Date()
  const today = now.toISOString().split('T')[0]

  // Résolution pennylane customer_id → clients.id (chantier 2026-07-06)
  const clientIdMap = await resolver.resolveMany(invoices.map((i) => extractInvoiceCustomerId(i)))

  // 1. Pré-UPSERT: lire l'état actuel de ces factures dans billing_sync
  // (l'id Pennylane arrive en nombre en V2, la colonne est un texte)
  const { data: existingRows } = await supabase
    .from('billing_sync')
    .select('pennylane_id, status, data, client_id')
    .eq('entity_type', 'invoice')
    .in('pennylane_id', invoices.map((i) => String(i.id)))

  const existingMap = new Map<string, ExistingInvoiceState>(
    (existingRows ?? []).map((r) => [
      r.pennylane_id,
      {
        pennylane_id: r.pennylane_id,
        status: r.status,
        data: r.data as Record<string, unknown>,
        client_id: r.client_id as string | null,
      },
    ])
  )

  const newlyOverdue: Array<{ inv: PennylaneInvoice; consecutiveCount: number }> = []
  const paidFromOverdue: Array<{ inv: PennylaneInvoice }> = []
  const labInvoicesPaid: Array<{ inv: PennylaneInvoice }> = []

  // 1bis. T-085 — date d'encaissement des factures qui viennent d'etre payees.
  // Sequentiel a dessein : le volume est de quelques factures par cycle, et on
  // ne veut pas declencher le 429 de Pennylane.
  const paidOnById = new Map<string, string>()
  for (const inv of invoices) {
    const pennylaneId = String(inv.id)
    if (!needsPaidOnLookup(inv.status, existingMap.get(pennylaneId)?.data)) continue
    const paidOn = await fetchPaidOnDate(pennylaneId, apiToken)
    if (paidOn) paidOnById.set(pennylaneId, paidOn)
  }

  // 2. Construire les lignes avec détection overdue
  const rows = invoices.map((inv) => {
    const pennylaneId = String(inv.id)
    const currentEntry = existingMap.get(pennylaneId)
    const currentData = currentEntry?.data ?? {}
    const currentStatus = currentEntry?.status

    const overdue = isInvoiceOverdue(inv.status, inv.deadline, today)
    const wasAlreadyOverdue = currentStatus === 'overdue'
    const isPaidNow = inv.status === 'paid'
    // T-083a — `late` compte aussi : sans lui, une facture passee en retard
    // puis payee n'etait pas vue comme un paiement recu.
    const wasPreviouslyOverdueOrUnpaid = wasUnsettled(currentStatus)

    let finalStatus = inv.status
    let mergedData = mergeInvoiceData(currentData, inv as unknown as Record<string, unknown>)

    // T-085 — `paid_on` est a NOUS (Pennylane ne l'envoie pas) : il survit a la
    // fusion. Une facture qui repasse impayee (avoir, annulation du
    // rapprochement) perd sa date, sinon elle resterait au CA pour toujours.
    const paidOn = paidOnById.get(pennylaneId)
    if (paidOn) mergedData = { ...mergedData, paid_on: paidOn }
    else if (inv.status !== 'paid') delete mergedData.paid_on

    if (overdue) {
      const newCount = getConsecutiveUnpaidCount(currentData) + 1
      finalStatus = 'overdue'
      mergedData = { ...mergedData, consecutive_unpaid_count: newCount }
      if (!wasAlreadyOverdue) {
        newlyOverdue.push({ inv, consecutiveCount: newCount })
      }
    } else if (isPaidNow && wasPreviouslyOverdueOrUnpaid) {
      // Transition vers payé depuis un état d'impayé — reset compteur
      mergedData = { ...mergedData, consecutive_unpaid_count: 0 }
      paidFromOverdue.push({ inv })
    }

    // Détection paiement Lab (Story 11.6)
    if (shouldActivateLabAccess(inv) && currentStatus !== 'paid') {
      labInvoicesPaid.push({ inv })
    }

    return {
      entity_type: 'invoice' as EntityType,
      pennylane_id: pennylaneId,
      // Client Pennylane non rattache a un client MonprojetPro : on garde le
      // lien deja pose par le Hub plutot que de l'effacer.
      client_id: resolveClientId(clientIdMap, extractInvoiceCustomerId(inv)) ?? currentEntry?.client_id ?? null,
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
  // T-083a — seul le NOM sert encore ici : on ne notifie plus le client, donc
  // ni son `auth_user_id` ni son email ne sont lus.
  const customerIds = [...new Set(newlyOverdue.map((o) => o.inv.customer_id))]
  const { data: clients } = await supabase
    .from('clients')
    .select('name, pennylane_customer_id')
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

    // ⚠️ T-083a — PLUS DE MESSAGE AUTOMATIQUE AU CLIENT ICI (decision MiKL,
    // 13-11). Cet INSERT declenchait `trg_send_email_on_notification`, donc un
    // VRAI email au client des le premier jour de retard, avec un texte fige
    // dans le code et impossible a relire.
    //
    // Le client est relance par le circuit prevu pour ca : `detect-overdue-
    // invoices` fait rediger un brouillon par Elio aux fenetres J+7 / J+14 /
    // J+30, MiKL le relit, le modifie et l'envoie depuis le Hub
    // (`reminder-modal.tsx` -> `sendReminder`).
    //
    // Garder les deux, c'etait ecrire deux fois au client pour un seul retard —
    // et trois fois si les relances automatiques de Pennylane sont actives.
    // MiKL, lui, reste prevenu : c'est la notification ci-dessus.

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
  // Shape réelle d'activity_logs : actor_type/action/entity_type/metadata
  // (l'ancien insert utilisait une colonne `type` inexistante → jamais journalisé)
  const { error } = await supabase.from('activity_logs').insert({
    actor_type: 'system',
    action: 'billing_sync_error',
    entity_type: 'billing_sync',
    metadata: { message, details },
  })
  if (error) console.error('[BILLING:SYNC] logError insert failed:', error)
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

  let upserted = 0

  // ⚠️ T-083 — en cas d'echec de lecture, on rend une ERREUR et on n'avance
  // PAS last_sync_at : le passage suivant reprendra les memes changements.
  if (entityType === 'invoice') {
    const fetched = await batchFetchByIds<PennylaneInvoice>('/customer_invoices', 'customer_invoices', ids, apiToken)
    if (fetched.errorDetail) return { synced: 0, rateLimited: false, error: true, errorDetail: fetched.errorDetail }
    // V2 : le client est sous `customer.id`. On remplit `customer_id` une fois
    // ici pour que toute la suite (notifications, activation Lab) le retrouve.
    const entities = fetched.items.map((inv) => ({
      ...inv,
      id: String(inv.id),
      customer_id: extractInvoiceCustomerId(inv) ?? undefined,
    }))
    // Filtrer par client_id si targetClientId est fourni (AC #5)
    const filtered = targetClientId
      ? entities.filter((inv) => inv.customer_id === targetClientId)
      : entities
    // Story 11.4 — upsertInvoices retourne maintenant les listes overdue/paid
    const invoiceResult = await upsertInvoices(supabase, filtered, resolver, apiToken)
    upserted = invoiceResult.upserted
    // Traiter les notifications overdue et paiements reçus
    await handleOverdueNotifications(supabase, invoiceResult.newlyOverdue)
    await handlePaidTransitionNotifications(supabase, invoiceResult.paidFromOverdue)
    // Activer accès Lab si paiement Lab détecté (Story 11.6)
    await handleLabPaymentActivations(supabase, invoiceResult.labInvoicesPaid)
  } else if (entityType === 'customer') {
    const fetched = await batchFetchByIds<PennylaneCustomer>('/customers', 'customers', ids, apiToken)
    if (fetched.errorDetail) return { synced: 0, rateLimited: false, error: true, errorDetail: fetched.errorDetail }
    const entities = fetched.items.map((c) => ({ ...c, id: String(c.id) }))
    // Filtrer par customer ID si targetClientId est fourni (AC #5)
    const filtered = targetClientId
      ? entities.filter((c) => c.id === targetClientId)
      : entities
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
      JSON.stringify({ error: 'Internal error', detail: errMsg.slice(0, 300), synced: 0 }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
