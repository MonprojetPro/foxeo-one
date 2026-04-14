'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function markNotificationRead(
  notificationId: string
): Promise<ActionResponse<{ id: string }>> {
  try {
    if (!notificationId || !UUID_REGEX.test(notificationId)) {
      return errorResponse('Identifiant notification invalide', 'INVALID_INPUT')
    }

    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .select('id')
      .single()

    if (error) {
      console.error('[CRM:MARK_NOTIFICATION_READ] Supabase error:', error)
      return errorResponse(
        'Impossible de marquer la notification comme lue',
        'DATABASE_ERROR',
        error
      )
    }

    if (!data) {
      return errorResponse('Notification non trouvée', 'NOT_FOUND')
    }

    return successResponse({ id: data.id })
  } catch (error) {
    console.error('[CRM:MARK_NOTIFICATION_READ] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}
