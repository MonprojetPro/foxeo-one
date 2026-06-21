'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

interface ToggleAgentEnabledInput {
  /** id de la row client_parcours_agents */
  stepId: string
  clientId: string
  enabled: boolean
}

/**
 * Active / désactive (grise) un agent précis du parcours d'un client.
 * - Désactivé = l'agent reste visible (grisé), conservé pour l'historique, exclu du calcul
 *   de complétion, et réactivable à tout moment (même après validation).
 * - N'altère PAS le `status` (progression) — is_enabled est orthogonal.
 * Opérateur uniquement.
 */
export async function toggleAgentEnabled(
  input: ToggleAgentEnabledInput
): Promise<ActionResponse<{ stepId: string; enabled: boolean }>> {
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

    const { stepId, clientId, enabled } = input
    if (!stepId || !clientId) {
      return errorResponse('Paramètres invalides', 'VALIDATION_ERROR')
    }

    const { error: updateError } = await supabase
      .from('client_parcours_agents')
      .update({ is_enabled: enabled })
      .eq('id', stepId)
      .eq('client_id', clientId)

    if (updateError) {
      console.error('[PARCOURS:TOGGLE_AGENT_ENABLED] Update error:', updateError)
      return errorResponse('Impossible de modifier l\'agent', 'DATABASE_ERROR', updateError)
    }

    // entity_type='client' + entity_id=clientId pour visibilité dans la timeline client
    await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operator.id,
      action: `parcours_agent_${enabled ? 'enabled' : 'disabled'}`,
      entity_type: 'client',
      entity_id: clientId,
      metadata: { stepId, enabled },
    })

    return successResponse({ stepId, enabled })
  } catch (error) {
    console.error('[PARCOURS:TOGGLE_AGENT_ENABLED] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
