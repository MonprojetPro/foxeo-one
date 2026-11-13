export type BillingMetrics = {
  /** Argent REELLEMENT encaisse sur le mois en cours, en centimes */
  monthlyRevenue: number
  /** Argent encaisse depuis toujours, avoirs deduits, en centimes (T-085) */
  totalRevenue: number
  /** Emis et non encaisse, avoirs deduits, en centimes */
  pendingAmount: number
  /** Nombre de devis en attente de reponse */
  pendingQuotesCount: number
  /** Revenu mensuel recurrent, en centimes */
  mrr: number
}

// ============================================================
// computeBillingMetrics — T-042
//
// Calcul des quatre compteurs du cockpit Comptabilite, EXTRAIT du hook pour
// etre testable.
//
// 🔑 Pourquoi l'extraire : la formule vivait dans le `queryFn` de
// `useBillingMetrics`, donc derriere un appel reseau — aucun test ne pouvait
// l'atteindre. C'est precisement la qu'un defaut s'etait loge sans bruit
// pendant des mois : « En attente » ne retenait que le statut `unpaid`, alors
// que Pennylane rend `upcoming` pour une facture emise non echue. Le compteur
// restait donc a zero tant qu'aucune facture n'etait en retard.
//
// Un calcul comptable qu'on ne peut pas verrouiller par un test finit toujours
// par mentir en silence.
// ============================================================

export type MetricsRow = {
  entity_type: string
  status: string
  amount: number | null
  data: Record<string, unknown> | null
  /**
   * T-045 — necessaire pour savoir si la facture qu'un avoir annule a ete
   * comptee au CA. Optionnel : les appelants anterieurs restent valides, un
   * avoir sans facture identifiable n'est simplement jamais deduit du CA.
   */
  pennylane_id?: string
}

/**
 * Une facture emise et pas encore encaissee — `upcoming`, `late`, `unpaid`,
 * `overdue`, `partially_paid`...
 *
 * 🔑 T-083 — SEULE definition du « en attente » : l'accueil du Hub et la liste
 * par client avaient chacun recopie la leur (`unpaid`/`pending`), qui ignorait
 * `upcoming`. Trois ecrans, trois chiffres pour les memes factures.
 *
 * 🔑 T-083a — la definition a DEMENAGE dans `@monprojetpro/utils` : Elio et
 * l'app client en ont besoin aussi, et un module ne peut pas en importer un
 * autre. Re-exportee ici pour ne rien casser chez les appelants existants.
 */
export { isInvoiceAwaitingPayment, isInvoicePastDue } from '@monprojetpro/utils'
import { isInvoiceAwaitingPayment } from '@monprojetpro/utils'

/**
 * Jour ou l'argent est entre, pour une facture payee.
 *
 * 🔑 T-085 — `paid_on` est pose par la synchro depuis la transaction bancaire
 * rapprochee chez Pennylane. AVANT, le CA se datait au jour de la FACTURE :
 * une facture d'octobre encaissee en novembre n'etait comptee ni en octobre
 * (pas encore payee) ni en novembre (pas facturee ce mois-la). Elle
 * disparaissait du chiffre d'affaires.
 *
 * ⚠️ REPLI ASSUME sur la date de facture quand `paid_on` manque (facture
 * encaissee avant le 2026-11-13, ou rapprochement introuvable chez Pennylane) :
 * mieux vaut un encaissement date approximativement que pas d'encaissement du
 * tout — le total, lui, reste juste dans les deux cas.
 */
function encashmentDate(data: Record<string, unknown> | null): string | undefined {
  return (data?.paid_on ?? data?.date ?? data?.updated_at) as string | undefined
}

function isCurrentMonth(data: Record<string, unknown> | null, now: Date): boolean {
  const dateStr = encashmentDate(data)
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return false
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

export function computeBillingMetrics(rows: MetricsRow[], now: Date = new Date()): BillingMetrics {
  let monthlyRevenue = 0
  let totalRevenue = 0
  let pendingAmount = 0
  let pendingQuotesCount = 0
  let mrr = 0

  // T-045 — quelles factures ont REELLEMENT ete comptees au CA, c'est-a-dire
  // encaissees. Passe prealable : un avoir peut referencer une facture situee
  // n'importe ou dans la liste, y compris avant lui.
  const paidInvoiceIds = new Set(
    rows
      .filter((r) => r.entity_type === 'invoice' && r.status === 'paid' && r.pennylane_id)
      .map((r) => r.pennylane_id as string)
  )

  for (const row of rows) {
    const amount = row.amount ?? 0
    const data = row.data ?? {}

    if (row.entity_type === 'invoice') {
      if (row.status === 'paid') {
        // T-085 — l'argent total ne depend d'aucun mois : tout ce qui a ete
        // encaisse y reste, meme une facture dont la date est introuvable.
        totalRevenue += amount
        if (isCurrentMonth(data, now)) monthlyRevenue += amount
      } else if (isInvoiceAwaitingPayment(row.status)) {
        // Tout ce qui est emis et non encaisse — `upcoming`, `unpaid`, `late`.
        // Brouillon, facture annulee ou supprimee : rien n'est du.
        pendingAmount += amount
      }
    } else if (row.entity_type === 'credit_note') {
      const creditedId = data.credited_invoice_pennylane_id as string | undefined
      const annuleUneRecetteEncaissee = creditedId != null && paidInvoiceIds.has(creditedId)

      // Montant deja negatif : il se soustrait de lui-meme, ce qui annule
      // la facture creditee encore due.
      //
      // 🔑 T-083 — SAUF si cette facture est deja soldee. Pennylane marque
      // `paid` une facture annulee par un avoir (reste a payer 0) : elle ne
      // compte deja plus dans « En attente ». Deduire l'avoir une seconde fois
      // retirait 478,80 € de factures reellement dues (2 400 € affiches au
      // lieu de 2 878,80 €).
      if (!annuleUneRecetteEncaissee) pendingAmount += amount

      // 🔑 T-045 — UN AVOIR NE DIMINUE LE CA QUE S'IL ANNULE UNE RECETTE
      // REELLEMENT COMPTEE, donc une facture PAYEE.
      //
      // Le defaut corrige etait une asymetrie : le Hub affichait « CA mensuel
      // -478,80 € » alors que RIEN n'avait ete encaisse. La facture F-2026-101
      // n'etait jamais entree au CA (jamais payee), mais l'avoir qui l'annule,
      // lui, en sortait. On soustrayait une recette qu'on n'avait jamais
      // additionnee.
      //
      // ⚠️ Le mois pris en compte est celui de L'AVOIR, pas celui de la facture :
      // un avoir emis en octobre sur une facture payee en septembre diminue le
      // CA d'octobre. On ne rouvre pas un mois clos.
      //
      // ⚠️ LIMITE ASSUMEE : un avoir dont la facture creditee n'est pas
      // identifiable (champ absent) n'est JAMAIS deduit du CA. On prefere ne
      // rien deviner — mais si cette facture etait payee, le CA reste trop haut.
      if (annuleUneRecetteEncaissee) {
        // L'argent rembourse sort du total, quel que soit le mois.
        totalRevenue += amount
        if (isCurrentMonth(data, now)) monthlyRevenue += amount
      }
    } else if (row.entity_type === 'quote') {
      if (row.status === 'pending') pendingQuotesCount++
    } else if (row.entity_type === 'subscription') {
      if (row.status === 'active') {
        const period = (data.recurring_period ?? 'monthly') as string
        if (period === 'monthly') mrr += amount
        else if (period === 'quarterly') mrr += amount / 3
        else if (period === 'yearly') mrr += amount / 12
      }
    }
  }

  return {
    monthlyRevenue,
    totalRevenue,
    // Un avoir superieur aux factures en attente donnerait un « en attente »
    // negatif, qui ne veut rien dire a l'ecran : le client ne doit plus rien.
    // Le CA mensuel, lui, PEUT etre negatif (avoir sur un mois anterieur).
    pendingAmount: Math.max(0, pendingAmount),
    pendingQuotesCount,
    mrr,
  }
}
