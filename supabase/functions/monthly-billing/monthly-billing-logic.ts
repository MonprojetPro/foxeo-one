// monthly-billing-logic.ts — Logique métier pure, testable par vitest.
// (Aucun import Deno — importée par index.ts avec extension .ts)
// Chantier Élio Hub / Coaching One+ (2026-07-06) — équipier Billing.

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PendingBillableItem {
  id: string
  client_id: string
  label: string
  amount_cents: number
}

export interface CoachingInvoiceLine {
  label: string
  quantity: number
  raw_currency_unit_price: string
  vat_rate: 'FR_200'
  unit: 'service'
}

// ── Fenêtre temporelle (le cron tourne le 1er du mois) ───────────────────────

/** Début du mois courant en ISO UTC — borne d'exclusion pour les items "du mois écoulé". */
export function startOfCurrentMonthISO(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

/** Libellé français du mois écoulé (ex: run le 1er juillet → "juin 2026"). */
export function previousMonthLabelFr(now: Date): string {
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  return prev.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

// ── Agrégation billable_items par client ─────────────────────────────────────

/** Regroupe les items pending par client_id — une facture Pennylane par client. */
export function groupItemsByClient(
  items: PendingBillableItem[]
): Map<string, PendingBillableItem[]> {
  const map = new Map<string, PendingBillableItem[]>()
  for (const item of items) {
    const existing = map.get(item.client_id)
    if (existing) {
      existing.push(item)
    } else {
      map.set(item.client_id, [item])
    }
  }
  return map
}

/** Total HT en centimes d'un lot d'items. */
export function sumAmountCents(items: PendingBillableItem[]): number {
  return items.reduce((sum, item) => sum + item.amount_cents, 0)
}

/** Lignes de facture Pennylane (format V2 : raw_currency_unit_price string). */
export function buildCoachingInvoiceLines(
  items: PendingBillableItem[]
): CoachingInvoiceLine[] {
  return items.map((item) => ({
    label: item.label,
    quantity: 1,
    raw_currency_unit_price: (item.amount_cents / 100).toFixed(2),
    vat_rate: 'FR_200' as const,
    unit: 'service' as const,
  }))
}

/** Libellé de la facture groupée : « Séances coaching supplémentaires — juin 2026 ». */
export function coachingInvoiceLabel(now: Date): string {
  return `Séances coaching supplémentaires — ${previousMonthLabelFr(now)}`
}
