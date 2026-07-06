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
