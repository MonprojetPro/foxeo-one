'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

/**
 * Server Action — Active un agent Élio Lab (archived = false).
 * L'agent redevient sélectionnable dans la liste des agents disponibles pour les parcours.
 */
export async function activateElioLabAgent(agentId: string): Promise<ActionResponse<null>> {
  if (!agentId) {
    return errorResponse('ID agent requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('elio_lab_agents')
    .update({ archived: false })
    .eq('id', agentId)
    .select('id')
    .single()

  if (error || !data) {
    return errorResponse('Agent introuvable', 'NOT_FOUND', error)
  }

  return successResponse(null)
}
