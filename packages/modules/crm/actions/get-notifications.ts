'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import type { Notification } from '../types/crm.types'

const PAGE_SIZE = 20

export async function getNotifications(
  offset: number = 0
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

    const { data, error } = await supabase
      .from('notifications')
      .select('id, recipient_type, recipient_id, type, title, body, link, read_at, created_at')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) {
      console.error('[CRM:GET_NOTIFICATIONS] Supabase error:', error)
      return errorResponse(
        'Impossible de charger les notifications',
        'DATABASE_ERROR',
        error
      )
    }

    if (!data) {
      return successResponse([])
    }

    // Transform snake_case → camelCase
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
    console.error('[CRM:GET_NOTIFICATIONS] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}
