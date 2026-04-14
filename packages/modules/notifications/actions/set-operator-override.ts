'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import {
  SetOperatorOverrideInput,
  mapPreferenceFromDB,
  type NotificationPreference,
} from '../types/notification-prefs.types'

export async function setOperatorOverride(
  input: SetOperatorOverrideInput
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

    const parsed = SetOperatorOverrideInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { clientId, notificationType, operatorOverride } = parsed.data

    // Vérifier que l'utilisateur courant est un opérateur
    const { data: operator } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!operator) {
      return errorResponse('Opération réservée aux opérateurs', 'UNAUTHORIZED')
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .update({ operator_override: operatorOverride })
      .eq('user_type', 'client')
      .eq('user_id', clientId)
      .eq('notification_type', notificationType)
      .select()
      .single()

    if (error || !data) {
      console.error('[NOTIFICATIONS:SET_OVERRIDE] Supabase error:', error)
      return errorResponse(
        'Impossible de définir l\'override opérateur',
        'DATABASE_ERROR',
        error
      )
    }

    return successResponse(mapPreferenceFromDB(data))
  } catch (error) {
    console.error('[NOTIFICATIONS:SET_OVERRIDE] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
