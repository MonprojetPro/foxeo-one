import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  CheckNotificationAllowedInput,
  CRITICAL_INAPP_TYPES,
  type NotificationAllowedResult,
} from '../types/notification-prefs.types'

const DEFAULT_ALLOWED: NotificationAllowedResult = { inapp: true, email: true }

export async function checkNotificationAllowed(
  input: CheckNotificationAllowedInput
): Promise<NotificationAllowedResult> {
  try {
    const parsed = CheckNotificationAllowedInput.safeParse(input)
    if (!parsed.success) {
      // Invalid input → fail-open (default to allowed)
      return DEFAULT_ALLOWED
    }

    const { recipientId, recipientType, notificationType } = parsed.data

    const supabase = await createServerSupabaseClient()

    const { data: pref, error } = await supabase
      .from('notification_preferences')
      .select('channel_email, channel_inapp, operator_override, notification_type')
      .eq('user_type', recipientType)
      .eq('user_id', recipientId)
      .eq('notification_type', notificationType)
      .maybeSingle()

    if (error || !pref) {
      // No preference found or DB error → fail-open defaults
      return DEFAULT_ALLOWED
    }

    // Override MiKL → force toujours
    if (pref.operator_override) {
      return DEFAULT_ALLOWED
    }

    // Types critiques → in-app toujours actif
    const isCritical = CRITICAL_INAPP_TYPES.includes(
      notificationType as (typeof CRITICAL_INAPP_TYPES)[number]
    )
    const inapp = isCritical ? true : pref.channel_inapp
    const email = pref.channel_email

    return { inapp, email }
  } catch {
    // Fail-open: on ne bloque jamais les notifications sur erreur
    return DEFAULT_ALLOWED
  }
}
