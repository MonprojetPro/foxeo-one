import type { InvoiceStatus } from '../types/billing.types'

// Libelles francais des statuts de facturation, AFFICHES AU CLIENT.
//
// 🔑 T-083a — cette table vivait en double, recopiee dans `invoices-list.tsx`
// et `documents-list.tsx`, et il y manquait `late`. Comme les deux listes
// retombent sur `row.status` quand le libelle est absent, un client dont la
// facture etait en retard lisait le mot anglais brut « late » au milieu d'une
// liste en francais. Exactement le defaut deja corrige en T-041d pour
// `credit_note` et `upcoming` — une table recopiee finit toujours par diverger.
//
// Le test `status-labels.test.ts` verrouille la couverture : tout statut
// declare dans `InvoiceStatus` doit avoir son libelle.

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Brouillon',
  upcoming: 'À échoir',
  late: 'En retard',
  overdue: 'En retard',
  partially_paid: 'Partiellement payée',
  paid: 'Payée',
  cancelled: 'Annulée',
  archived: 'Archivée',
  credit_note: 'Avoir',
  deleted: 'Supprimée',
  unpaid: 'Impayée',
  pending: 'En attente',
}

/** Statuts propres aux devis, qui partagent les memes listes a l'ecran. */
export const QUOTE_STATUS_LABELS: Record<string, string> = {
  accepted: 'Accepté',
  denied: 'Refusé',
}

export const BILLING_STATUS_LABELS: Record<string, string> = {
  ...INVOICE_STATUS_LABELS,
  ...QUOTE_STATUS_LABELS,
}
