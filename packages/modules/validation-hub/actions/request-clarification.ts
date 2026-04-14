'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { errorResponse, successResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import { z } from 'zod'
import type { ValidationRequest } from '../types/validation.types'

const requestClarificationSchema = z.object({
  requestId: z.string().uuid('requestId doit être un UUID valide'),
  comment: z
    .string()
    .min(10, 'Le commentaire doit contenir au moins 10 caractères')
    .max(1000, 'Le commentaire ne doit pas dépasser 1000 caractères'),
})

export async function requestClarification(
  requestId: string,
  comment: string
): Promise<ActionResponse<ValidationRequest>> {
  try {
    const validated = requestClarificationSchema.safeParse({ requestId, comment })
    if (!validated.success) {
      return errorResponse('Données invalides', 'VALIDATION_ERROR', validated.error)
    }

    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    // Update the validation_request
    const { data, error } = await supabase
      .from('validation_requests')
      .update({
        status: 'needs_clarification',
        reviewer_comment: comment,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      console.error('[VALIDATION-HUB:CLARIFICATION] Error updating request:', error)
      return errorResponse("Erreur lors de l'envoi de la question", 'DB_ERROR', error)
    }

    const requestData = data as {
      id: string
      client_id: string
      type: string
      title: string
      [key: string]: unknown
    }

    // Create notification for client
    const { data: clientData } = await supabase
      .from('clients')
      .select('auth_user_id')
      .eq('id', requestData.client_id)
      .single()

    if (clientData?.auth_user_id) {
      const link =
        requestData.type === 'brief_lab' ? '/modules/parcours-lab' : '/modules/core-dashboard'

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          recipient_type: 'client',
          recipient_id: clientData.auth_user_id,
          type: 'validation',
          title: `MiKL a une question sur '${requestData.title}'`,
          body: comment,
          link,
        })
        .select('id')
        .single()

      if (notifError) {
        console.error('[VALIDATION-HUB:CLARIFICATION] Error creating notification:', notifError)
        // Non-blocking: we still return success since the main action succeeded
      }
    }

    return successResponse(toCamelCase(requestData) as ValidationRequest)
  } catch (err) {
    console.error('[VALIDATION-HUB:CLARIFICATION] Unexpected error:', err)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', err)
  }
}
