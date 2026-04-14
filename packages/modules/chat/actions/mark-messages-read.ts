'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { MarkMessagesReadInput } from '../types/chat.types'

export async function markMessagesRead(
  input: MarkMessagesReadInput
): Promise<ActionResponse<{ updatedCount: number }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = MarkMessagesReadInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { clientId } = parsed.data

    // Determine caller role: operator marks client messages, client marks operator messages
    const { data: operator } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    const senderTypeToMark = operator ? 'client' : 'operator'

    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('messages')
      .update({ read_at: now })
      .eq('client_id', clientId)
      .eq('sender_type', senderTypeToMark)
      .is('read_at', null)
      .select('id')

    if (error) {
      console.error('[CHAT:MARK_READ] DB update error:', error)
      return errorResponse('Erreur lors du marquage des messages', 'DB_ERROR', error)
    }

    const updatedCount = data?.length ?? 0
    console.info(`[CHAT:MARK_READ] Updated ${updatedCount} messages for client ${clientId}`)

    return successResponse({ updatedCount })
  } catch (error) {
    console.error('[CHAT:MARK_READ] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
