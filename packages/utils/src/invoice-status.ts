// Vocabulaire des statuts de facture — partage par TOUS les consommateurs.
// Un module ne peut pas en importer un autre : ces valeurs vivent donc ici,
// comme `attachment-constraints`.
//
// 🔑 T-083a — Pennylane V2 dit `late` pour une facture echue non payee. Le Hub,
// lui, cherchait `unpaid`, un mot que l'API ne renvoie plus. Consequences
// constatees le 13-11 : aucune alerte de retard n'est JAMAIS partie, le robot
// de relances n'a jamais rien cree, et le bouton « Payer maintenant » restait
// cache au client des que sa facture passait en retard.
//
// Le defaut etait a HUIT endroits parce que chaque ecran avait recopie sa
// propre liste de statuts. Meme lecon que T-083 : une seule definition.

/** Rien n'est du : encaisse, pas encore emis, ou annule. */
const SETTLED_STATUSES = ['paid', 'draft', 'cancelled', 'archived', 'deleted'] as const

/**
 * L'echeance est depassee.
 * `late` = le mot de Pennylane V2 · `overdue` = pose par notre synchro quand
 * elle detecte le retard · `unpaid` = l'ancien mot, garde pour les lignes
 * ecrites avant le passage en V2.
 */
const PAST_DUE_STATUSES = ['late', 'overdue', 'unpaid'] as const

const SETTLED = new Set<string>(SETTLED_STATUSES)
const PAST_DUE = new Set<string>(PAST_DUE_STATUSES)

/** Facture emise et non encaissee — y compris pas encore echue (`upcoming`). */
export function isInvoiceAwaitingPayment(status: string): boolean {
  return !SETTLED.has(status)
}

/** Facture dont l'echeance est passee. Sous-ensemble du precedent. */
export function isInvoicePastDue(status: string): boolean {
  return PAST_DUE.has(status)
}

/**
 * Pour les requetes Supabase : `.in('status', PAST_DUE_STATUS_LIST)`.
 * Ensemble ferme de trois mots connus, donc enumerable sans risque.
 */
export const PAST_DUE_STATUS_LIST: string[] = [...PAST_DUE_STATUSES]

/**
 * Pour les requetes Supabase :
 * `.not('status', 'in', SETTLED_STATUS_SQL_LIST)`.
 *
 * ⚠️ Filtre NEGATIF a dessein, miroir exact de `isInvoiceAwaitingPayment`.
 * Enumerer les statuts « dus » serait fragile : un nouveau mot de Pennylane
 * serait oublie en silence — c'est exactement le defaut de T-083a.
 *
 * Valeurs entre guillemets : c'est la forme attendue par PostgREST, deja
 * eprouvee dans `start-handoff.ts`.
 */
export const SETTLED_STATUS_SQL_LIST = `(${SETTLED_STATUSES.map((s) => `"${s}"`).join(',')})`
