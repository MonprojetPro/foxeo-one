'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { errorResponse, successResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import { z } from 'zod'
import type { ValidationRequest } from '../types/validation.types'

const postponeRequestSchema = z.object({
  requestId: z.string().uuid('requestId doit être un UUID valide'),
  requestTitle: z.string().min(1, 'Le titre est requis'),
  clientName: z.string().min(1, 'Le nom du client est requis'),
  reason: z.string().max(500, 'La raison ne doit pas dépasser 500 caractères').optional(),
  reminderDate: z.string().datetime().optional(),
})

export async function postponeRequest(
  requestId: string,
  requestTitle: string,
  clientName: string,
  reason?: string,
  reminderDate?: string
): Promise<ActionResponse<ValidationRequest>> {
  try {
    const validated = postponeRequestSchema.safeParse({
      requestId,
      requestTitle,
      clientName,
      reason,
      reminderDate,
    })
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

    const reviewerComment = reason ? `Reporté : ${reason}` : 'Reporté'

    // 1. Update reviewer_comment (keep pending status)
    const { data, error } = await supabase
      .from('validation_requests')
      .update({
        reviewer_comment: reviewerComment,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      console.error('[VALIDATION-HUB:POSTPONE] Error updating request:', error)
      return errorResponse('Erreur lors du report', 'DB_ERROR', error)
    }

    // 2. Create system reminder notification for operator if reminderDate provided
    if (reminderDate) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          recipient_type: 'operator',
          recipient_id: user.id,
          type: 'system',
          title: `Rappel : demande '${requestTitle}' de ${clientName} à traiter`,
          body: reason ?? null,
          link: `/modules/validation-hub/${requestId}`,
          scheduled_at: reminderDate,
        })
        .select('id')
        .single()

      if (notifError) {
        console.error('[VALIDATION-HUB:POSTPONE] Error creating reminder notification:', notifError)
        // Non-blocking
      }
    }

    return successResponse(toCamelCase(data) as ValidationRequest)
  } catch (err) {
    console.error('[VALIDATION-HUB:POSTPONE] Unexpected error:', err)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', err)
  }
}
