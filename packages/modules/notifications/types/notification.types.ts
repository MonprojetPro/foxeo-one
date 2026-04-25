import { z } from 'zod'

// ============================================================
// Enums
// ============================================================

export const RecipientTypeEnum = z.enum(['client', 'operator'])
export type RecipientType = z.infer<typeof RecipientTypeEnum>

export const NotificationTypeEnum = z.enum([
  'message',
  'validation',
  'alert',
  'system',
  'graduation',
  'payment',
  'inactivity_alert',
  'csv_import_complete',
  'export_ready',
  'elio_escalation',
])
export type NotificationType = z.infer<typeof NotificationTypeEnum>

// ============================================================
// Domain types (camelCase)
// ============================================================

export const Notification = z.object({
  id: z.string().uuid(),
  recipientType: RecipientTypeEnum,
  recipientId: z.string().uuid(),
  type: NotificationTypeEnum,
  title: z.string(),
  body: z.string().nullable(),
  link: z.string().nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
})

export type Notification = z.infer<typeof Notification>

// ============================================================
// DB types (snake_case)
// ============================================================

export type NotificationDB = {
  id: string
  recipient_type: string
  recipient_id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

// ============================================================
// Input types
// ============================================================

export const GetNotificationsInput = z.object({
  recipientId: z.string().uuid(),
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(50).default(20),
})

export type GetNotificationsInput = z.infer<typeof GetNotificationsInput>

export const CreateNotificationInput = z.object({
  recipientType: RecipientTypeEnum,
  recipientId: z.string().uuid(),
  type: NotificationTypeEnum,
  title: z.string().min(1).max(255),
  body: z.string().max(1000).nullable().optional(),
  link: z.string().max(500).nullable().optional(),
})

export type CreateNotificationInput = z.infer<typeof CreateNotificationInput>

export const MarkAsReadInput = z.object({
  notificationId: z.string().uuid(),
})

export type MarkAsReadInput = z.infer<typeof MarkAsReadInput>

// ============================================================
// Icon mapping
// ============================================================

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  message: 'message-circle',
  validation: 'check-circle',
  alert: 'alert-triangle',
  system: 'info',
  graduation: 'award',
  payment: 'credit-card',
  inactivity_alert: 'clock',
  csv_import_complete: 'file-check',
  export_ready: 'download',
  elio_escalation: 'alert-triangle',
}
