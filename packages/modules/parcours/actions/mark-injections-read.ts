'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'

export interface MarkInjectionsReadResult {
  updatedCount: number
}

/**
 * Server Action Client — Marque toutes les injections non lues d'une étape comme lues.
 * Appelé automatiquement au chargement de la page étape.
 * Retourne toujours { data, error } — jamais throw.
 */
export async function markInjectionsRead(
  stepId: string
): Promise<ActionResponse<MarkInjectionsReadResult>> {
  if (!stepId) {
    return errorResponse('stepId requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return errorResponse('Non authentifié', 'UNAUTHORIZED')
  }

  // Récupérer le client associé à l'utilisateur
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (clientError) {
    return errorResponse('Erreur lors de la récupération du client', 'DB_ERROR', {
      message: clientError.message,
    })
  }
  if (!client) {
    return errorResponse('Client non trouvé', 'NOT_FOUND')
  }

  // Marquer toutes les injections non lues de cette étape comme lues
  const { data: updated, error: updateError } = await supabase
    .from('step_feedback_injections')
    .update({ read_at: new Date().toISOString() })
    .eq('step_id', stepId)
    .eq('client_id', client.id)
    .is('read_at', null)
    .select('id')

  if (updateError) {
    return errorResponse('Erreur lors du marquage en lu', 'DB_ERROR', {
      message: updateError.message,
    })
  }

  return successResponse({ updatedCount: updated?.length ?? 0 })
}
