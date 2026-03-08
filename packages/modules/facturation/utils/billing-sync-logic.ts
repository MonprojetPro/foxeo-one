// Logique métier billing-sync — testable hors Edge Function (Deno)
// Utilisée dans supabase/functions/billing-sync/index.ts
// et testée via packages/modules/facturation/utils/billing-sync-logic.test.ts

export const MAX_CONSECUTIVE_ERRORS = 3
export const BATCH_SIZE = 100
export const PENNYLANE_BASE_URL = 'https://app.pennylane.com/api/external/v2'

export type EntityType = 'invoice' | 'customer' | 'quote' | 'subscription'

export interface ChangelogEntry {
  id: string
  operation: 'insert' | 'update' | 'delete'
}

export interface ChangelogPage {
  changelogs: ChangelogEntry[]
  has_more: boolean
  next_cursor?: string
}

export interface BillingSyncState {
  entity_type: EntityType
  last_sync_at: string
  consecutive_errors: number
  last_error?: string | null
}

// ── Parsing changelog ─────────────────────────────────────────────────────────

/**
 * Sépare les IDs à upsert (insert/update) des IDs à soft-delete.
 */
export function parseChangelogPage(page: ChangelogPage): {
  upsertIds: string[]
  deleteIds: string[]
} {
  const upsertIds: string[] = []
  const deleteIds: string[] = []

  for (const entry of page.changelogs) {
    if (entry.operation === 'delete') {
      deleteIds.push(entry.id)
    } else {
      upsertIds.push(entry.id)
    }
  }

  return { upsertIds, deleteIds }
}

/**
 * Agrège plusieurs pages de changelog en listes consolidées.
 */
export function aggregateChangelogPages(pages: ChangelogPage[]): {
  upsertIds: string[]
  deleteIds: string[]
} {
  const upsertIds: string[] = []
  const deleteIds: string[] = []

  for (const page of pages) {
    const parsed = parseChangelogPage(page)
    upsertIds.push(...parsed.upsertIds)
    deleteIds.push(...parsed.deleteIds)
  }

  return { upsertIds, deleteIds }
}

// ── Gestion erreurs consécutives ──────────────────────────────────────────────

/**
 * Retourne true si la notification MiKL doit être envoyée.
 */
export function shouldNotifyOperator(consecutiveErrors: number): boolean {
  return consecutiveErrors >= MAX_CONSECUTIVE_ERRORS
}

/**
 * Calcule le nouvel état après une erreur.
 */
export function computeErrorState(
  state: BillingSyncState,
  errorMessage: string
): BillingSyncState {
  return {
    ...state,
    consecutive_errors: state.consecutive_errors + 1,
    last_error: errorMessage,
  }
}

/**
 * Calcule le nouvel état après un succès (reset des erreurs).
 */
export function computeSuccessState(state: BillingSyncState): BillingSyncState {
  return {
    ...state,
    last_sync_at: new Date().toISOString(),
    consecutive_errors: 0,
    last_error: null,
  }
}

// ── Batch helpers ─────────────────────────────────────────────────────────────

/**
 * Divise un tableau en chunks de taille donnée.
 */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

/**
 * Construit le paramètre filter Pennylane pour un batch d'IDs.
 */
export function buildIdFilter(ids: string[]): string {
  return JSON.stringify([{ field: 'id', operator: 'in', value: ids }])
}

// ── URL construction ──────────────────────────────────────────────────────────

/**
 * Construit l'URL changelog avec start_date (première page).
 */
export function buildChangelogUrl(entityPath: string, lastSyncAt: string): string {
  const params = new URLSearchParams({ start_date: lastSyncAt, per_page: '1000' })
  return `${PENNYLANE_BASE_URL}${entityPath}?${params.toString()}`
}

/**
 * Construit l'URL changelog avec cursor (pages suivantes).
 */
export function buildChangelogCursorUrl(entityPath: string, cursor: string): string {
  const params = new URLSearchParams({ cursor, per_page: '1000' })
  return `${PENNYLANE_BASE_URL}${entityPath}?${params.toString()}`
}

/**
 * Extrait le retry-after d'un header 429 (défaut: 60 secondes).
 */
export function extractRetryAfter(headers: Headers): number {
  return parseInt(headers.get('retry-after') ?? '60', 10)
}

// ── Lab Invoice detection (Story 11.6) ───────────────────────────────────────

export const LAB_INVOICE_TAG = '[FOXEO_LAB]'
export const LAB_AMOUNT_CENTS = 19900

/**
 * Retourne true si la facture est identifiée comme une facture Lab Foxeo.
 */
export function isLabInvoice(pdfFreeText: string | null | undefined): boolean {
  return typeof pdfFreeText === 'string' && pdfFreeText.includes(LAB_INVOICE_TAG)
}

/**
 * Retourne true si la facture Lab vient d'être payée (doit activer l'accès Lab).
 */
export function shouldActivateLabAccess(invoice: {
  status: string
  pdf_invoice_free_text: string | null | undefined
}): boolean {
  return invoice.status === 'paid' && isLabInvoice(invoice.pdf_invoice_free_text)
}

// ── UPSERT row builders ───────────────────────────────────────────────────────

export interface InvoiceRow {
  entity_type: 'invoice'
  pennylane_id: string
  status: string
  data: Record<string, unknown>
  amount: number
  last_synced_at: string
}

export interface CustomerRow {
  entity_type: 'customer'
  pennylane_id: string
  status: string
  data: Record<string, unknown>
  last_synced_at: string
}

/**
 * Construit une ligne billing_sync pour une facture Pennylane.
 * amount stocké en centimes (integer).
 */
export function buildInvoiceRow(invoice: Record<string, unknown>, syncedAt: string): InvoiceRow {
  return {
    entity_type: 'invoice',
    pennylane_id: invoice.id as string,
    status: invoice.status as string,
    data: invoice,
    amount: Math.round(((invoice.amount as number) ?? 0) * 100),
    last_synced_at: syncedAt,
  }
}

/**
 * Construit une ligne billing_sync pour un customer Pennylane.
 */
export function buildCustomerRow(customer: Record<string, unknown>, syncedAt: string): CustomerRow {
  return {
    entity_type: 'customer',
    pennylane_id: customer.id as string,
    status: 'active',
    data: customer,
    last_synced_at: syncedAt,
  }
}
