/**
 * Déclenche « le mot d'Élio le Concierge » (LOT F) après une décision de validation,
 * pour le NOUVEAU modèle de parcours (`client_parcours_agents`, type `step_submission`).
 *
 * - Pas concerné : les briefs de l'ancien modèle (`brief_lab`) → on sort tôt, aucun appel.
 * - Best-effort : ne JAMAIS faire échouer la validation si la génération échoue.
 * - Import dynamique de `generateConciergeWord` (module-parcours) : chargé uniquement quand
 *   l'événement est pertinent, pour ne pas alourdir les chemins non concernés.
 *
 * @param rpcData row `validation_requests` retournée par approve/reject_validation_request.
 */
export async function notifyConciergeOfDecision(
  supabase: {
    from: (table: string) => any
  },
  rpcData: { type?: string; step_id?: string | null; client_id?: string | null; reviewer_comment?: string | null } | null,
  decision: 'approved' | 'rejected'
): Promise<void> {
  try {
    if (!rpcData || rpcData.type !== 'step_submission' || !rpcData.step_id || !rpcData.client_id) {
      return
    }
    const clientId = rpcData.client_id
    const comment = rpcData.reviewer_comment ?? undefined

    // Nom réel de l'agent concerné.
    const { data: agent } = await supabase
      .from('client_parcours_agents')
      .select('step_label')
      .eq('id', rpcData.step_id)
      .maybeSingle()
    const agentLabel: string = agent?.step_label ?? 'cette étape'

    const { generateConciergeWord } = await import('@monprojetpro/module-parcours')

    if (decision === 'rejected') {
      await generateConciergeWord(clientId, { type: 'submission_revision', agentLabel, comment })
      return
    }

    // Validé : est-ce la DERNIÈRE étape (parcours terminé) ?
    const { count } = await supabase
      .from('client_parcours_agents')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('is_enabled', true)
      .neq('status', 'completed')
      .neq('status', 'skipped')

    if ((count ?? 0) === 0) {
      await generateConciergeWord(clientId, { type: 'parcours_completed', agentLabel })
    } else {
      await generateConciergeWord(clientId, { type: 'submission_approved', agentLabel, comment })
    }
  } catch (e) {
    console.error('[VALIDATION-HUB:CONCIERGE] Mot d\'Élio non généré (ignoré):', e)
  }
}
