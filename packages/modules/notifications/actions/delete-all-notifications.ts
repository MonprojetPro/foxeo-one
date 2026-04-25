'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

export async function deleteAllNotifications(
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
      .delete()
      .eq('recipient_id', recipientId)

    if (error) {
      console.error('[NOTIFICATIONS:DELETE_ALL] Supabase error:', error)
      return errorResponse(
        'Impossible de vider les notifications',
        'DATABASE_ERROR',
        error
      )
    }

    return successResponse({ success: true })
  } catch (error) {
    console.error('[NOTIFICATIONS:DELETE_ALL] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}
