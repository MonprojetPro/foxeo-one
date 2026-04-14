'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

export async function markAllAsRead(
  recipientId: string
): Promise<ActionResponse<{ success: boolean }>> {
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

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', recipientId)
      .is('read_at', null)

    if (error) {
      console.error('[NOTIFICATIONS:MARK_ALL_READ] Supabase error:', error)
      return errorResponse(
        'Impossible de tout marquer comme lu',
        'DATABASE_ERROR',
        error
      )
    }

    return successResponse({ success: true })
  } catch (error) {
    console.error('[NOTIFICATIONS:MARK_ALL_READ] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}
