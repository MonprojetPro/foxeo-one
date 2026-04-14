'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { GetMessagesInput, type MessageDB } from '../types/chat.types'
import { toMessage } from '../utils/to-message'

export async function getMessages(
  input: GetMessagesInput
): Promise<ActionResponse<Message[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = GetMessagesInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { clientId } = parsed.data

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[CHAT:GET_MESSAGES] DB error:', error)
      return errorResponse('Erreur lors du chargement des messages', 'DB_ERROR', error)
    }

    return successResponse((data as MessageDB[]).map(toMessage))
  } catch (error) {
    console.error('[CHAT:GET_MESSAGES] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
