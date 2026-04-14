'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { z } from 'zod'
import { RecipientTypeEnum } from '../types/notification.types'
import {
  PREFERENCE_NOTIFICATION_TYPES,
  mapPreferenceFromDB,
  type NotificationPreference,
} from '../types/notification-prefs.types'

const GetNotificationPrefsInput = z.object({
  userId: z.string().uuid(),
  userType: RecipientTypeEnum,
})

export async function getNotificationPrefs(input: {
  userId: string
  userType: 'client' | 'operator'
}): Promise<ActionResponse<NotificationPreference[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = GetNotificationPrefsInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { userId, userType } = parsed.data

    // Try a pure read first (avoids write-amplification on every page load)
    const { data: existing, error: selectError } = await supabase
      .from('notification_preferences')
      .select()
      .eq('user_type', userType)
      .eq('user_id', userId)

    if (selectError) {
      console.error('[NOTIFICATIONS:GET_PREFS] Supabase select error:', selectError)
      return errorResponse('Impossible de récupérer les préférences', 'DATABASE_ERROR', selectError)
    }

    // If all types already exist, return immediately (hot path)
    if (existing && existing.length >= PREFERENCE_NOTIFICATION_TYPES.length) {
      return successResponse(existing.map(mapPreferenceFromDB))
    }

    // Lazy initialization: upsert missing defaults only (cold path — first visit)
    const defaults = PREFERENCE_NOTIFICATION_TYPES.map((type) => ({
      user_type: userType,
      user_id: userId,
      notification_type: type,
      channel_email: true,
      channel_inapp: true,
      operator_override: false,
    }))

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(defaults, { onConflict: 'user_type,user_id,notification_type', ignoreDuplicates: true })
      .select()

    if (error || !data) {
      console.error('[NOTIFICATIONS:GET_PREFS] Supabase upsert error:', error)
      return errorResponse('Impossible de récupérer les préférences', 'DATABASE_ERROR', error)
    }

    return successResponse(data.map(mapPreferenceFromDB))
  } catch (error) {
    console.error('[NOTIFICATIONS:GET_PREFS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
