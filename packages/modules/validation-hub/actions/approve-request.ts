'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { errorResponse, successResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import { z } from 'zod'
import type { ValidationRequest } from '../types/validation.types'

const approveRequestSchema = z.object({
  requestId: z.string().uuid('requestId doit être un UUID valide'),
  comment: z.string().max(500, 'Le commentaire ne doit pas dépasser 500 caractères').optional(),
})

export async function approveRequest(
  requestId: string,
  comment?: string
): Promise<ActionResponse<ValidationRequest>> {
  try {
    const validated = approveRequestSchema.safeParse({ requestId, comment })
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

    const { data, error } = await supabase.rpc('approve_validation_request', {
      p_request_id: requestId,
      p_comment: comment ?? null,
      p_operator_id: operator.id,
    })

    if (error) {
      console.error('[VALIDATION-HUB:APPROVE] Error:', error)
      return errorResponse('Erreur lors de la validation', 'DB_ERROR', error)
    }

    return successResponse(toCamelCase(data) as ValidationRequest)
  } catch (err) {
    console.error('[VALIDATION-HUB:APPROVE] Unexpected error:', err)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', err)
  }
}
