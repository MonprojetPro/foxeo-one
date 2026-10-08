export type BillingMetrics = {
  /** CA encaisse sur le mois en cours, en centimes */
  monthlyRevenue: number
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
}

function isCurrentMonth(data: Record<string, unknown> | null, now: Date): boolean {
  const dateStr = (data?.date ?? data?.updated_at) as string | undefined
  if (!dateStr) return false
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return false
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

export function computeBillingMetrics(rows: MetricsRow[], now: Date = new Date()): BillingMetrics {
  let monthlyRevenue = 0
  let pendingAmount = 0
  let pendingQuotesCount = 0
  let mrr = 0

  for (const row of rows) {
    const amount = row.amount ?? 0
    const data = row.data ?? {}

    if (row.entity_type === 'invoice') {
      if (row.status === 'paid') {
        if (isCurrentMonth(data, now)) monthlyRevenue += amount
      } else if (row.status !== 'draft') {
        // Tout ce qui est emis et non encaisse — `upcoming`, `unpaid`, `late`.
        // Un brouillon n'est pas du : il est exclu.
        pendingAmount += amount
      }
    } else if (row.entity_type === 'credit_note') {
      // Montant deja negatif : il se soustrait de lui-meme, ce qui annule
      // naturellement la facture creditee, sans traitement particulier.
      pendingAmount += amount
      if (isCurrentMonth(data, now)) monthlyRevenue += amount
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
    // Un avoir superieur aux factures en attente donnerait un « en attente »
    // negatif, qui ne veut rien dire a l'ecran : le client ne doit plus rien.
    // Le CA mensuel, lui, PEUT etre negatif (avoir sur un mois anterieur).
    pendingAmount: Math.max(0, pendingAmount),
    pendingQuotesCount,
    mrr,
  }
}
