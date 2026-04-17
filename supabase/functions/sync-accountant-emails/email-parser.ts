// Story 13-9 — Email parser stub
// À configurer avec les vrais patterns regex quand MiKL fournit un exemple
// d'email Pennylane comptable (sujet, corps, structure).

export type AccountantNotificationType = 'missing_receipt' | 'info_request' | 'other'

export interface ParsedEmail {
  type: AccountantNotificationType
  title: string
  body: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Patterns probables à identifier (à confirmer avec un vrai email Pennylane)
// ─────────────────────────────────────────────────────────────────────────────
//
// const MISSING_RECEIPT_PATTERNS = [
//   /justificatif manquant/i,
//   /pièce justificative/i,
//   /document absent/i,
// ]
//
// const INFO_REQUEST_PATTERNS = [
//   /demande d'information/i,
//   /précision(s)? requise(s)?/i,
// ]
//
// Décommenter et adapter après réception du premier email réel.

// ─────────────────────────────────────────────────────────────────────────────
// parseAccountantEmail — stub : retourne type 'other' avec le sujet brut
// ─────────────────────────────────────────────────────────────────────────────

export function parseAccountantEmail(subject: string, snippet: string): ParsedEmail {
  return {
    type: 'other',
    title: subject || 'Message comptable',
    body: snippet || '',
  }
}
