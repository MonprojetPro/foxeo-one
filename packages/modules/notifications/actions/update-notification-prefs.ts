'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import {
  UpdatePreferenceInput,
  CRITICAL_INAPP_TYPES,
  mapPreferenceFromDB,
  type NotificationPreference,
} from '../types/notification-prefs.types'

export async function updateNotificationPrefs(
  input: UpdatePreferenceInput
): Promise<ActionResponse<NotificationPreference>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = UpdatePreferenceInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { userId, userType, notificationType, channelEmail, channelInapp } = parsed.data

    // Build update payload
    const updatePayload: Record<string, boolean | string> = {}

    if (channelEmail !== undefined) {
      updatePayload.channel_email = channelEmail
    }

    if (channelInapp !== undefined) {
      // Force in-app = true for critical notification types
      const isCritical = CRITICAL_INAPP_TYPES.includes(
        notificationType as (typeof CRITICAL_INAPP_TYPES)[number]
      )
      updatePayload.channel_inapp = isCritical ? true : channelInapp
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .update(updatePayload)
      .eq('user_type', userType)
      .eq('user_id', userId)
      .eq('notification_type', notificationType)
      .select()
      .single()

    if (error || !data) {
      console.error('[NOTIFICATIONS:UPDATE_PREFS] Supabase error:', error)
      return errorResponse('Impossible de mettre à jour la préférence', 'DATABASE_ERROR', error)
    }

    return successResponse(mapPreferenceFromDB(data))
  } catch (error) {
    console.error('[NOTIFICATIONS:UPDATE_PREFS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
