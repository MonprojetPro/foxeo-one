'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

/**
 * Server Action — Archive un agent Élio Lab (archived = true).
 * L'agent reste visible dans le catalogue avec badge "Archivé"
 * mais n'est plus sélectionnable lors de l'assemblage de parcours.
 */
export async function archiveElioLabAgent(agentId: string): Promise<ActionResponse<null>> {
  if (!agentId) {
    return errorResponse('ID agent requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  // H2: Vérifier que l'agent existe et a bien été archivé (pas de succès silencieux)
  const { data, error } = await supabase
    .from('elio_lab_agents')
    .update({ archived: true })
    .eq('id', agentId)
    .select('id')
    .single()

  if (error || !data) {
    return errorResponse('Agent introuvable ou déjà archivé', 'NOT_FOUND', error)
  }

  return successResponse(null)
}
