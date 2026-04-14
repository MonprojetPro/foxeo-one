'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import type { ElioMessagePersisted, ElioMessageRole } from '../types/elio.types'

/**
 * Server Action — Persiste un message dans elio_messages.
 * Utilisé en interne pour sauvegarder les échanges utilisateur/assistant.
 * Retourne toujours { data, error } — jamais throw.
 */
export async function saveElioMessage(
  conversationId: string,
  role: ElioMessageRole,
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<ActionResponse<ElioMessagePersisted>> {
  if (!conversationId || !content.trim()) {
    return errorResponse('conversationId et content requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('elio_messages')
    .insert({ conversation_id: conversationId, role, content, metadata })
    .select()
    .single()

  if (error) {
    return errorResponse('Erreur lors de la sauvegarde du message', 'DB_ERROR', error)
  }

  const message = toCamelCase(data) as unknown as ElioMessagePersisted
  return successResponse(message)
}
