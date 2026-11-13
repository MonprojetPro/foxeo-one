// Logique métier detection des échecs de paiement — Story 11.4
// Testable hors Edge Function Deno.
// Utilisée dans supabase/functions/billing-sync/index.ts

export const CONSECUTIVE_UNPAID_THRESHOLD = 3

// ── Types ──────────────────────────────────────────────────────────────────────

export type ExistingBillingSyncEntry = {
  pennylane_id: string
  status: string
  data: Record<string, unknown>
}

export type InvoiceClassification = {
  isNewlyOverdue: boolean
  wasAlreadyOverdue: boolean
  isPaidFromOverdue: boolean
  newConsecutiveCount: number
}

// ── Pure functions ─────────────────────────────────────────────────────────────

/**
 * Retourne true si une facture est en retard de paiement.
 *
 * 🔑 T-083a — Pennylane V2 dit `late` quand l'echeance est passee. Cette
 * fonction ne connaissait que `unpaid`, un mot que l'API ne renvoie plus :
 * elle rendait toujours `false`, et aucune alerte de retard n'est jamais
 * partie.
 */
export function isInvoiceOverdue(
  invoiceStatus: string,
  deadline: string | null | undefined,
  today: string
): boolean {
  // `late` : Pennylane a DEJA constate le retard, rien a recalculer.
  if (invoiceStatus === 'late') return true
  // `unpaid` : ancien mot, qui ne disait pas si l'echeance etait passee.
  return invoiceStatus === 'unpaid' && !!deadline && deadline < today
}

/**
 * Extrait le compteur d'impayés consécutifs depuis le JSONB.
 */
export function getConsecutiveUnpaidCount(data: Record<string, unknown>): number {
  const count = data.consecutive_unpaid_count
  return typeof count === 'number' ? count : 0
}

/**
 * Construit les données JSONB pour une facture overdue.
 * Merge le compteur dans les données Pennylane existantes.
 */
export function buildOverdueData(
  invoiceData: Record<string, unknown>,
  consecutiveCount: number
): Record<string, unknown> {
  return { ...invoiceData, consecutive_unpaid_count: consecutiveCount }
}

/**
 * Construit les données JSONB pour une facture payée (reset compteur à 0).
 */
export function buildPaidData(invoiceData: Record<string, unknown>): Record<string, unknown> {
  return { ...invoiceData, consecutive_unpaid_count: 0 }
}

/**
 * Retourne true si une alerte critique MiKL doit être envoyée (3+ impayés consécutifs).
 */
export function shouldSendCriticalAlert(consecutiveCount: number): boolean {
  return consecutiveCount >= CONSECUTIVE_UNPAID_THRESHOLD
}

/**
 * Retourne true si l'état passe de overdue/unpaid → paid.
 */
export function isPaidTransition(
  previousStatus: string | undefined,
  pennylaneStatus: string
): boolean {
  // T-083a — `late` compte aussi, sinon une facture passee en retard puis
  // payee n'etait pas vue comme un paiement recu.
  return (
    pennylaneStatus === 'paid' &&
    (previousStatus === 'overdue' || previousStatus === 'unpaid' || previousStatus === 'late')
  )
}

/**
 * Classifie une facture selon l'état actuel en DB et la donnée Pennylane fraîche.
 * Retourne les flags de classification et le nouveau compteur.
 */
export function classifyInvoice(
  pennylaneStatus: string,
  pennylaneDeadline: string | null | undefined,
  today: string,
  currentEntry: ExistingBillingSyncEntry | undefined
): InvoiceClassification {
  const currentStatus = currentEntry?.status
  const currentData = currentEntry?.data ?? {}

  const overdue = isInvoiceOverdue(pennylaneStatus, pennylaneDeadline, today)
  const wasAlreadyOverdue = currentStatus === 'overdue'
  const isNewlyOverdue = overdue && !wasAlreadyOverdue
  const isPaidFromOverdueFlag = isPaidTransition(currentStatus, pennylaneStatus)

  let newConsecutiveCount = 0
  if (overdue) {
    newConsecutiveCount = getConsecutiveUnpaidCount(currentData) + 1
  }

  return {
    isNewlyOverdue,
    wasAlreadyOverdue,
    isPaidFromOverdue: isPaidFromOverdueFlag,
    newConsecutiveCount,
  }
}
