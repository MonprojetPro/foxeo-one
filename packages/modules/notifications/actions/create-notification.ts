'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { CreateNotificationInput, type Notification } from '../types/notification.types'
import { checkNotificationAllowed } from './check-notification-allowed'

export async function createNotification(
  input: CreateNotificationInput
): Promise<ActionResponse<Notification>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = CreateNotificationInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { recipientType, recipientId, type, title, body, link } = parsed.data

    // Vérifier les préférences avant envoi (AC5)
    const allowed = await checkNotificationAllowed({
      recipientId,
      recipientType,
      notificationType: type,
    })

    if (!allowed.inapp) {
      // In-app désactivé par les préférences → skip silencieux, pas une erreur
      return successResponse(null)
    }

    // NB : PAS de `.select()` ici. Une notification cible TOUJOURS un autre
    // utilisateur (recipient_id ≠ auth.uid()). Or la policy SELECT de
    // `notifications` est `recipient_id = auth.uid()`. Un INSERT ... RETURNING
    // appliquerait cette policy SELECT à la ligne retournée → rejet RLS (42501).
    // On insère donc sans RETURNING (WITH CHECK = true → autorisé).
    const { error } = await supabase
      .from('notifications')
      .insert({
        recipient_type: recipientType,
        recipient_id: recipientId,
        type,
        title,
        body: body ?? null,
        link: link ?? null,
      })

    if (error) {
      console.error('[NOTIFICATIONS:CREATE] Supabase error:', error)
      return errorResponse(
        'Impossible de créer la notification',
        'DATABASE_ERROR',
        error
      )
    }

    return successResponse(null)
  } catch (error) {
    console.error('[NOTIFICATIONS:CREATE] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}
