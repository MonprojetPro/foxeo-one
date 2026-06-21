'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { generateConciergeWord } from './generate-concierge-word'

interface ReopenAgentInput {
  /** id de la row client_parcours_agents (nouveau modèle). */
  agentId: string
  clientId: string
  /** Motif optionnel affiché au client dans la notification. */
  reason?: string
}

/**
 * Rouvre un agent du parcours déjà TERMINÉ (`completed → active`) pour que le client
 * puisse soumettre une nouvelle version de son document, même après validation.
 *
 * Reflète exactement le flux de REFUS (`reject_validation_request`) : remettre l'agent
 * en `active` réactive la re-soumission côté client. La soumission validée précédente
 * reste dans l'historique ; une nouvelle soumission créera une nouvelle demande de validation.
 *
 * ⚠️ Aucun impact sur les agents SUIVANTS (pas de cascade) : le client peut revenir sur un
 *    ancien agent puis reprendre ses autres étapes là où il en était.
 * ⚠️ Notification : `recipient_id = auth_user_id` (sinon la notif est silencieusement perdue —
 *    la RLS de `notifications` filtre `recipient_id = auth.uid()`). C'est le bug latent de
 *    `reopen-step.ts` (ancien modèle) qu'on ne reproduit PAS ici.
 *
 * L'UPDATE de `client_parcours_agents` déclenche le trigger `broadcast_parcours_change`
 * → la home « Mon Parcours » du client se rafraîchit en direct (RSC-009).
 *
 * Opérateur uniquement.
 */
export async function reopenAgent(
  input: ReopenAgentInput
): Promise<ActionResponse<{ agentId: string; status: 'active' }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    const { agentId, clientId, reason } = input
    if (!agentId || !clientId) {
      return errorResponse('Paramètres invalides', 'VALIDATION_ERROR')
    }

    // Récupérer l'agent et vérifier qu'il est bien 'completed'
    const { data: agent, error: agentError } = await supabase
      .from('client_parcours_agents')
      .select('id, status, step_label')
      .eq('id', agentId)
      .eq('client_id', clientId)
      .single()

    if (agentError || !agent) {
      return errorResponse('Agent introuvable', 'NOT_FOUND', agentError)
    }

    if (agent.status !== 'completed') {
      return errorResponse('Seul un agent terminé peut être rouvert', 'INVALID_STATUS')
    }

    // completed → active : réactive la re-soumission (même mécanisme que le refus).
    const { error: updateError } = await supabase
      .from('client_parcours_agents')
      .update({ status: 'active' })
      .eq('id', agentId)
      .eq('client_id', clientId)

    if (updateError) {
      console.error('[PARCOURS:REOPEN_AGENT] Update error:', updateError)
      return errorResponse('Impossible de rouvrir l\'agent', 'DATABASE_ERROR', updateError)
    }

    // Notification client — recipient_id = auth_user_id (convention notifications).
    const { data: client } = await supabase
      .from('clients')
      .select('auth_user_id')
      .eq('id', clientId)
      .single()

    if (client?.auth_user_id) {
      await supabase.from('notifications').insert({
        recipient_type: 'client',
        recipient_id: client.auth_user_id,
        type: 'validation',
        title: `L'étape « ${agent.step_label} » a été rouverte`,
        body: reason
          ? `MiKL a rouvert cette étape : ${reason}. Tu peux soumettre une nouvelle version de ton document.`
          : `MiKL a rouvert cette étape. Tu peux soumettre une nouvelle version de ton document.`,
        link: '/modules/parcours',
      })
    }

    // « Mot d'Élio » vivant (LOT F) — best-effort : ne JAMAIS faire échouer la réouverture
    // si la génération IA échoue. L'INSERT déclenche le broadcast → le bandeau client se met à jour.
    try {
      await generateConciergeWord(clientId, {
        type: 'agent_reopened',
        agentLabel: agent.step_label,
        reason,
      })
    } catch (e) {
      console.error('[PARCOURS:REOPEN_AGENT] Mot d\'Élio non généré (ignoré):', e)
    }

    // Journal d'activité — entity_type='client' pour visibilité dans la timeline client
    await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operator.id,
      action: 'parcours_agent_reopened',
      entity_type: 'client',
      entity_id: clientId,
      metadata: { agentId, agentLabel: agent.step_label, reason: reason ?? null },
    })

    return successResponse({ agentId, status: 'active' as const })
  } catch (error) {
    console.error('[PARCOURS:REOPEN_AGENT] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
