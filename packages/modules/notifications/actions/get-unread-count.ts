'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

export async function getUnreadCount(
  recipientId: string
): Promise<ActionResponse<{ count: number }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    if (recipientId !== user.id) {
      return errorResponse('Accès interdit', 'FORBIDDEN')
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', recipientId)
      .is('read_at', null)

    if (error) {
      console.error('[NOTIFICATIONS:UNREAD_COUNT] Supabase error:', error)
      return errorResponse(
        'Impossible de compter les notifications',
        'DATABASE_ERROR',
        error
      )
    }

    return successResponse({ count: count ?? 0 })
  } catch (error) {
    console.error('[NOTIFICATIONS:UNREAD_COUNT] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}
