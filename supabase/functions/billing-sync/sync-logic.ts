// Pure logic billing-sync — testable par vitest (aucun import Deno).
// Chantier 2026-07-06 (T4 Billing) : résolution client_id + sync subscriptions.

// ── Résolution pennylane_customer_id → clients.id ─────────────────────────────

export interface ClientLookupRow {
  id: string
  pennylane_customer_id: string | null
}

/** Normalise un customer id Pennylane (string|number) en clé de map stable. */
export function normalizeCustomerId(
  customerId: string | number | null | undefined
): string | null {
  if (customerId === null || customerId === undefined) return null
  const s = String(customerId).trim()
  return s.length > 0 && s !== 'undefined' && s !== 'null' ? s : null
}

/** Construit la map pennylane_customer_id → clients.id à partir des rows clients. */
export function buildCustomerClientMap(clients: ClientLookupRow[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const c of clients) {
    const key = normalizeCustomerId(c.pennylane_customer_id)
    if (key) map.set(key, c.id)
  }
  return map
}

/** Résout un client_id depuis la map (null si client inconnu côté MonprojetPro). */
export function resolveClientId(
  map: Map<string, string | null>,
  customerId: string | number | null | undefined
): string | null {
  const key = normalizeCustomerId(customerId)
  if (!key) return null
  return map.get(key) ?? null
}

// ── Lecture des listes Pennylane V2 (T-083) ───────────────────────────────────
//
// 🔑 L'API V2 rend TOUTES ses listes sous `items` (doc officielle
// getCustomerInvoices). La synchro lisait `customer_invoices` / `customers` :
// la liste revenait toujours vide, la fonction repondait `synced: 0` sans
// erreur, et le Hub a affiche pendant un mois des factures « a venir » qui
// etaient payees. La cle historique reste lue en repli, rien de plus.

export function extractListItems<T>(
  payload: Record<string, unknown> | null | undefined,
  legacyKey: string
): T[] {
  if (!payload) return []
  const list = payload.items ?? payload[legacyKey]
  return Array.isArray(list) ? (list as T[]) : []
}

export interface PennylaneInvoiceRef {
  customer_id?: string | number | null
  customer?: { id?: string | number } | null
  status?: string | null
  amount?: string | number | null
}

/** V2 : le client est sous `customer.id` ; `customer_id` n'existe plus. */
export function extractInvoiceCustomerId(inv: PennylaneInvoiceRef): string | null {
  return normalizeCustomerId(inv.customer_id ?? inv.customer?.id ?? null)
}

/**
 * Un avoir arrive par la MEME liste que les factures. Il est deja suivi sous
 * `entity_type = 'credit_note'` (cree par create-credit-note, avec le lien vers
 * la facture annulee) : le reecrire en `invoice` creerait un doublon, compte
 * deux fois dans « En attente ».
 */
export function isCreditNotePayload(inv: PennylaneInvoiceRef): boolean {
  if (inv.status === 'credit_note') return true
  const amount = Number(inv.amount)
  return !Number.isNaN(amount) && amount < 0
}

/**
 * La ligne locale porte des cles posees par le Hub (notes de restauration,
 * geste commercial, compteur d'impayes) que Pennylane ne connait pas : on
 * fusionne, Pennylane fait foi sur ses propres champs.
 */
export function mergeInvoiceData(
  current: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  return { ...(current ?? {}), ...incoming }
}

// ── Date d'encaissement (T-085) ───────────────────────────────────────────────
//
// 🔑 Pennylane ne met AUCUNE date de paiement sur la facture elle-meme, et son
// bloc `payments` n'en porte pas non plus (champs : id, label, currency,
// currency_amount, status, created_at, updated_at — verifie dans la doc
// officielle getCustomerInvoicePayments). La seule vraie date d'encaissement
// est celle de la transaction bancaire rapprochee
// (getCustomerInvoiceMatchedTransactions, champ `date`).
//
// Sans elle, le CA du mois datait l'encaissement au jour de la FACTURE : une
// facture d'octobre encaissee en novembre n'etait comptee dans aucun mois.

export interface MatchedTransactionRef {
  /** Date de l'operation bancaire, au format YYYY-MM-DD */
  date?: string | null
  archived_at?: string | null
}

export interface PaymentRef {
  created_at?: string | null
  status?: string | null
}

/** Garde les 10 premiers caracteres d'une date ISO → YYYY-MM-DD. */
function toIsoDay(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const day = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null
}

/**
 * Jour ou l'argent est reellement entre, `null` si on ne peut pas le savoir.
 *
 * On prend la transaction bancaire LA PLUS RECENTE : un reglement en plusieurs
 * fois n'est solde qu'au dernier versement, et c'est ce jour-la que la facture
 * passe `paid`. A defaut de transaction, la date de creation du paiement
 * Pennylane. On ne devine jamais : pas de date exploitable → `null`.
 */
export function extractPaidOnDate(
  matchedTransactions: MatchedTransactionRef[] | null | undefined,
  payments: PaymentRef[] | null | undefined
): string | null {
  const txDays = (matchedTransactions ?? [])
    .filter((t) => !t.archived_at)
    .map((t) => toIsoDay(t.date))
    .filter((d): d is string => d !== null)

  if (txDays.length > 0) return txDays.sort()[txDays.length - 1]

  const payDays = (payments ?? [])
    .map((p) => toIsoDay(p.created_at))
    .filter((d): d is string => d !== null)

  if (payDays.length > 0) return payDays.sort()[payDays.length - 1]

  return null
}

/**
 * Faut-il aller chercher la date d'encaissement de cette facture chez
 * Pennylane ? Seulement si elle est payee et qu'on ne la connait pas deja —
 * sinon on rappellerait deux endpoints par facture a chaque cycle de 5 min.
 */
export function needsPaidOnLookup(
  status: string,
  currentData: Record<string, unknown> | null | undefined
): boolean {
  if (status !== 'paid') return false
  return typeof currentData?.paid_on !== 'string'
}

// ── Retard de paiement (T-083a) ───────────────────────────────────────────────
//
// 🔑 Pennylane V2 dit `late` pour une facture echue non payee. Cette fonction
// ne connaissait que `unpaid`, un mot que l'API ne renvoie plus : la detection
// ne s'est JAMAIS declenchee, donc aucune alerte de retard n'est partie.
//
// ⚠️ Copie Deno du vocabulaire de `@monprojetpro/utils/invoice-status` — une
// Edge Function ne peut pas importer un package workspace. Les tests de ce
// fichier verrouillent la copie ; si tu changes l'un, change l'autre.

export function isInvoiceOverdue(
  status: string,
  deadline: string | null | undefined,
  today: string
): boolean {
  // `late` : Pennylane a DEJA constate le retard, il n'y a rien a recalculer.
  if (status === 'late') return true
  // `unpaid` : ancien mot, qui ne disait pas si l'echeance etait passee.
  return status === 'unpaid' && !!deadline && deadline < today
}

/** Statuts qui, en base, signifient « pas encore paye » — pour voir un passage au paiement. */
export function wasUnsettled(previousStatus: string | undefined): boolean {
  return previousStatus === 'overdue' || previousStatus === 'unpaid' || previousStatus === 'late'
}

// ── Subscriptions Pennylane ───────────────────────────────────────────────────

export interface PennylaneSubscriptionApi {
  id: string | number
  customer_id?: string | number
  customer?: { id?: string | number }
  status?: string
  start_date?: string
  recurring_period?: string
  amount?: string | number
  line_items?: Array<{
    quantity?: number
    raw_currency_unit_price?: string | number
  }>
  [key: string]: unknown
}

/** Extrait le customer id d'une subscription (les payloads V2 varient : customer_id ou customer.id). */
export function extractSubscriptionCustomerId(
  sub: PennylaneSubscriptionApi
): string | null {
  return normalizeCustomerId(sub.customer_id ?? sub.customer?.id ?? null)
}

/**
 * Montant mensuel de l'abonnement en centimes.
 * Priorité au champ amount ; sinon somme des line_items (quantity × raw_currency_unit_price).
 * null si aucune info exploitable.
 */
export function computeSubscriptionAmountCents(
  sub: PennylaneSubscriptionApi
): number | null {
  const direct = Number(sub.amount)
  if (sub.amount !== undefined && sub.amount !== null && !isNaN(direct)) {
    return Math.round(direct * 100)
  }
  if (Array.isArray(sub.line_items) && sub.line_items.length > 0) {
    let total = 0
    let found = false
    for (const li of sub.line_items) {
      const unit = Number(li.raw_currency_unit_price)
      if (isNaN(unit)) continue
      const qty = typeof li.quantity === 'number' && !isNaN(li.quantity) ? li.quantity : 1
      total += unit * qty
      found = true
    }
    return found ? Math.round(total * 100) : null
  }
  return null
}
