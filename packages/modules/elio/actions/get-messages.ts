'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@foxeo/types'
import { toCamelCase } from '@foxeo/utils'
import type { ElioMessagePersisted } from '../types/elio.types'

export const PAGE_SIZE = 50

/**
 * Server Action — Récupère les messages d'une conversation avec pagination inverse.
 * page=0 = messages les plus récents.
 * Retourne toujours { data, error } — jamais throw.
 */
export async function getMessages(
  conversationId: string,
  page: number = 0
): Promise<ActionResponse<ElioMessagePersisted[]>> {
  if (!conversationId) {
    return errorResponse('conversationId requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error } = await supabase
    .from('elio_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    return errorResponse('Erreur lors du chargement des messages', 'DB_ERROR', error)
  }

  const messages = (data ?? [])
    .map((row) => toCamelCase(row) as unknown as ElioMessagePersisted)
    .reverse() // ordre chronologique pour affichage

  return successResponse(messages)
}
