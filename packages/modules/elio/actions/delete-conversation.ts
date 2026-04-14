'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'

/**
 * Server Action — Supprime une conversation Élio et tous ses messages (CASCADE).
 * RLS garantit que seul le propriétaire peut supprimer.
 */
export async function deleteConversation(
  conversationId: string
): Promise<ActionResponse<null>> {
  if (!conversationId) {
    return errorResponse('conversationId requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('elio_conversations')
    .delete()
    .eq('id', conversationId)

  if (error) {
    console.error('[ELIO:DELETE_CONVERSATION] Error:', error)
    return errorResponse('Erreur lors de la suppression', 'DB_ERROR', error)
  }

  return successResponse(null)
}
