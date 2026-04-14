'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'

/**
 * Server Action — Mise à jour manuelle du titre d'une conversation Élio.
 * RLS garantit que l'utilisateur ne peut modifier que ses propres conversations.
 * Retourne toujours { data, error } — jamais throw.
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<ActionResponse<void>> {
  if (!conversationId) {
    return errorResponse('conversationId requis', 'VALIDATION_ERROR')
  }

  const trimmedTitle = title.trim()
  if (!trimmedTitle) {
    return errorResponse('Le titre ne peut pas être vide', 'VALIDATION_ERROR')
  }
  if (trimmedTitle.length > 100) {
    return errorResponse('Le titre ne peut pas dépasser 100 caractères', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('elio_conversations')
    .update({ title: trimmedTitle })
    .eq('id', conversationId)

  if (error) {
    return errorResponse('Erreur lors de la mise à jour du titre', 'DB_ERROR', error)
  }

  return successResponse(undefined)
}
