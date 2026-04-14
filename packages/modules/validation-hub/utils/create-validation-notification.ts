import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { errorResponse, successResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'

type CreateNotificationParams = {
  clientId: string
  title: string
  body?: string | null
  link?: string | null
}

/**
 * Creates a 'validation' type notification for a client (approval).
 * Note: In production, this is handled atomically by approve_validation_request RPC.
 * This utility is used for testing and reference.
 */
export async function createValidationApprovedNotification(
  params: CreateNotificationParams
): Promise<ActionResponse<{ notificationId: string }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: client } = await supabase
      .from('clients')
      .select('auth_user_id')
      .eq('id', params.clientId)
      .single()

    const recipientId = client?.auth_user_id ?? null

    if (!recipientId) {
      return errorResponse('Client introuvable pour la notification', 'NOT_FOUND')
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        recipient_type: 'client',
        recipient_id: recipientId,
        type: 'validation',
        title: params.title,
        body: params.body ?? null,
        link: params.link ?? null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[VALIDATION-HUB:NOTIFY] createValidationApprovedNotification error:', error)
      return errorResponse('Impossible de créer la notification', 'DATABASE_ERROR', error)
    }

    return successResponse({ notificationId: (data as { id: string }).id })
  } catch (err) {
    console.error('[VALIDATION-HUB:NOTIFY] createValidationApprovedNotification unexpected error:', err)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', err)
  }
}

/**
 * Creates a 'validation' type notification for a client (rejection).
 * Note: In production, this is handled atomically by reject_validation_request RPC.
 * This utility is used for testing and reference.
 */
export async function createValidationRejectedNotification(
  params: CreateNotificationParams
): Promise<ActionResponse<{ notificationId: string }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: client } = await supabase
      .from('clients')
      .select('auth_user_id')
      .eq('id', params.clientId)
      .single()

    const recipientId = client?.auth_user_id ?? null

    if (!recipientId) {
      return errorResponse('Client introuvable pour la notification', 'NOT_FOUND')
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        recipient_type: 'client',
        recipient_id: recipientId,
        type: 'validation',
        title: params.title,
        body: params.body ?? null,
        link: params.link ?? null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[VALIDATION-HUB:NOTIFY] createValidationRejectedNotification error:', error)
      return errorResponse('Impossible de créer la notification', 'DATABASE_ERROR', error)
    }

    return successResponse({ notificationId: (data as { id: string }).id })
  } catch (err) {
    console.error('[VALIDATION-HUB:NOTIFY] createValidationRejectedNotification unexpected error:', err)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', err)
  }
}
