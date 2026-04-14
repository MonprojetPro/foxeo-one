'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import type { Notification } from '../types/notification.types'
import { GetNotificationsInput } from '../types/notification.types'

export async function getNotifications(
  input: GetNotificationsInput
): Promise<ActionResponse<Notification[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = GetNotificationsInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { recipientId, offset, limit } = parsed.data

    if (recipientId !== user.id) {
      return errorResponse('Accès interdit', 'FORBIDDEN')
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('id, recipient_type, recipient_id, type, title, body, link, read_at, created_at')
      .eq('recipient_id', recipientId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[NOTIFICATIONS:GET] Supabase error:', error)
      return errorResponse(
        'Impossible de charger les notifications',
        'DATABASE_ERROR',
        error
      )
    }

    if (!data) {
      return successResponse([])
    }

    const notifications: Notification[] = data.map((n) => ({
      id: n.id,
      recipientType: n.recipient_type as Notification['recipientType'],
      recipientId: n.recipient_id,
      type: n.type as Notification['type'],
      title: n.title,
      body: n.body,
      link: n.link,
      readAt: n.read_at,
      createdAt: n.created_at,
    }))

    return successResponse(notifications)
  } catch (error) {
    console.error('[NOTIFICATIONS:GET] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}
