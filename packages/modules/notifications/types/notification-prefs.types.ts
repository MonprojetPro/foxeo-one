import { z } from 'zod'
import { RecipientTypeEnum, NotificationTypeEnum } from './notification.types'

// ============================================================
// Constants
// ============================================================

/**
 * Types de notifications affichés dans la page préférences (UI).
 * Exclut les types internes (inactivity_alert, csv_import_complete).
 */
export const PREFERENCE_NOTIFICATION_TYPES = [
  'message',
  'validation',
  'alert',
  'system',
  'graduation',
  'payment',
  'tool_update',
  'tool_comment',
] as const

export type NotificationPreferenceType = (typeof PREFERENCE_NOTIFICATION_TYPES)[number]

/**
 * Types critiques : le canal in-app NE PEUT PAS être désactivé.
 * Forcé côté serveur dans updateNotificationPrefs et checkNotificationAllowed.
 */
export const CRITICAL_INAPP_TYPES: NotificationPreferenceType[] = ['system', 'graduation']

// ============================================================
// Domain types (camelCase)
// ============================================================

export const NotificationPreference = z.object({
  id: z.string().uuid(),
  userType: RecipientTypeEnum,
  userId: z.string().uuid(),
  notificationType: NotificationTypeEnum,
  channelEmail: z.boolean(),
  channelInapp: z.boolean(),
  operatorOverride: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type NotificationPreference = z.infer<typeof NotificationPreference>

// ============================================================
// DB types (snake_case)
// ============================================================

export type NotificationPreferenceDB = {
  id: string
  user_type: string
  user_id: string
  notification_type: string
  channel_email: boolean
  channel_inapp: boolean
  operator_override: boolean
  created_at: string
  updated_at: string
}

// ============================================================
// Input types
// ============================================================

export const UpdatePreferenceInput = z
  .object({
    userId: z.string().uuid(),
    userType: RecipientTypeEnum,
    notificationType: NotificationTypeEnum,
    channelEmail: z.boolean().optional(),
    channelInapp: z.boolean().optional(),
  })
  .refine((data) => data.channelEmail !== undefined || data.channelInapp !== undefined, {
    message: 'Au moins un canal (channelEmail ou channelInapp) doit être fourni',
  })

export type UpdatePreferenceInput = z.infer<typeof UpdatePreferenceInput>

export const SetOperatorOverrideInput = z.object({
  clientId: z.string().uuid(),
  notificationType: NotificationTypeEnum,
  operatorOverride: z.boolean(),
})

export type SetOperatorOverrideInput = z.infer<typeof SetOperatorOverrideInput>

export const CheckNotificationAllowedInput = z.object({
  recipientId: z.string().uuid(),
  recipientType: RecipientTypeEnum,
  notificationType: NotificationTypeEnum,
})

export type CheckNotificationAllowedInput = z.infer<typeof CheckNotificationAllowedInput>

export type NotificationAllowedResult = {
  inapp: boolean
  email: boolean
}

// ============================================================
// DB → Domain mapper
// ============================================================

export function mapPreferenceFromDB(db: NotificationPreferenceDB): NotificationPreference {
  return {
    id: db.id,
    userType: db.user_type as NotificationPreference['userType'],
    userId: db.user_id,
    notificationType: db.notification_type as NotificationPreference['notificationType'],
    channelEmail: db.channel_email,
    channelInapp: db.channel_inapp,
    operatorOverride: db.operator_override,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}
