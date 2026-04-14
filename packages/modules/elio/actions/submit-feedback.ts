'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import type { FeedbackRating } from '../types/elio.types'

/**
 * Server Action — Enregistre le feedback (utile/pas utile) sur un message Élio.
 * Stocke dans elio_messages.metadata.feedback.
 * Collecte silencieuse — aucune notification envoyée.
 * Retourne toujours { data, error } — jamais throw.
 */
export async function submitFeedback(
  messageId: string,
  rating: FeedbackRating | null
): Promise<ActionResponse<boolean>> {
  if (!messageId) {
    return errorResponse('messageId requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  // Récupérer le message existant pour merger le metadata
  const { data: existing, error: fetchError } = await supabase
    .from('elio_messages')
    .select('metadata')
    .eq('id', messageId)
    .single()

  if (fetchError || !existing) {
    return errorResponse('Message non trouvé', 'NOT_FOUND', fetchError)
  }

  const currentMetadata = (existing.metadata as Record<string, unknown>) ?? {}

  const newMetadata = rating
    ? {
        ...currentMetadata,
        feedback: {
          rating,
          createdAt: new Date().toISOString(),
        },
      }
    : {
        ...currentMetadata,
        feedback: null,
      }

  const { error: updateError } = await supabase
    .from('elio_messages')
    .update({ metadata: newMetadata })
    .eq('id', messageId)

  if (updateError) {
    return errorResponse('Erreur lors de la sauvegarde du feedback', 'DB_ERROR', updateError)
  }

  return successResponse(true)
}
