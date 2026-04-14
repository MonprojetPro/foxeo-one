'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { errorResponse, successResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import { z } from 'zod'
import type { ValidationRequest } from '../types/validation.types'

const resubmitRequestSchema = z.object({
  requestId: z.string().uuid('requestId doit être un UUID valide'),
  newContent: z
    .string()
    .min(1, 'Le contenu ne peut pas être vide')
    .max(10000, 'Le contenu est trop long'),
})

/**
 * Resubmit a validation request with updated content (client side — Lab/One).
 * Called by the client after receiving a needs_clarification notification.
 *
 * Flow:
 *   1. Update validation_requests: content, status='pending', updated_at
 *   2. Create notification for the operator (MiKL)
 *
 * This action is intended for use in Epic 6 (parcours-lab module).
 * See docs/flows.md for the full clarification ↔ resubmission cycle.
 */
export async function resubmitRequest(
  requestId: string,
  newContent: string
): Promise<ActionResponse<ValidationRequest>> {
  try {
    const validated = resubmitRequestSchema.safeParse({ requestId, newContent })
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

    // Update the validation_request
    const { data, error } = await supabase
      .from('validation_requests')
      .update({
        content: newContent,
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      console.error('[VALIDATION-HUB:RESUBMIT] Error updating request:', error)
      return errorResponse('Erreur lors de la re-soumission', 'DB_ERROR', error)
    }

    const requestData = data as {
      id: string
      client_id: string
      operator_id: string
      title: string
      [key: string]: unknown
    }

    // Fetch client name for the notification title (AC 4)
    const { data: clientData } = await supabase
      .from('clients')
      .select('name')
      .eq('id', requestData.client_id)
      .single()

    const clientName = clientData?.name ?? 'Le client'

    // Create notification for operator (MiKL)
    const { data: operatorData } = await supabase
      .from('operators')
      .select('auth_user_id')
      .eq('id', requestData.operator_id)
      .single()

    if (operatorData?.auth_user_id) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          recipient_type: 'operator',
          recipient_id: operatorData.auth_user_id,
          type: 'validation',
          title: `Le client ${clientName} a répondu à votre question sur '${requestData.title}'`,
          body: null,
          link: `/modules/validation-hub/${requestData.id}`,
        })
        .select('id')
        .single()

      if (notifError) {
        console.error('[VALIDATION-HUB:RESUBMIT] Error creating operator notification:', notifError)
        // Non-blocking
      }
    }

    return successResponse(toCamelCase(requestData) as ValidationRequest)
  } catch (err) {
    console.error('[VALIDATION-HUB:RESUBMIT] Unexpected error:', err)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', err)
  }
}
