'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import type { MessageSummary } from '../types/validation.types'

export async function getClientRecentMessages(
  clientId: string
): Promise<ActionResponse<MessageSummary[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_type, content, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(3)

    if (error) {
      console.error(
        '[VALIDATION-HUB:GET_RECENT_MESSAGES] Supabase error:',
        error
      )
      return errorResponse(
        'Impossible de charger les messages récents',
        'DATABASE_ERROR',
        error
      )
    }

    const messages: MessageSummary[] = (data ?? []).map((row) => ({
      id: row.id,
      senderType: row.sender_type as 'client' | 'operator',
      content: row.content,
      createdAt: row.created_at,
    }))

    return successResponse(messages)
  } catch (error) {
    console.error(
      '[VALIDATION-HUB:GET_RECENT_MESSAGES] Unexpected error:',
      error
    )
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}
