'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { MarkAsReadInput } from '../types/notification.types'

export async function markAsRead(
  input: MarkAsReadInput
): Promise<ActionResponse<{ id: string }>> {
  try {
    const parsed = MarkAsReadInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
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
      .eq('id', parsed.data.notificationId)
      .select('id')
      .single()

    if (error) {
      console.error('[NOTIFICATIONS:MARK_READ] Supabase error:', error)
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
    console.error('[NOTIFICATIONS:MARK_READ] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}
