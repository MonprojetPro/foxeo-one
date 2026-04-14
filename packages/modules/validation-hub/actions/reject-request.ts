'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { errorResponse, successResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import { z } from 'zod'
import type { ValidationRequest } from '../types/validation.types'

const rejectRequestSchema = z.object({
  requestId: z.string().uuid('requestId doit être un UUID valide'),
  comment: z
    .string()
    .min(10, 'Le commentaire doit contenir au moins 10 caractères')
    .max(500, 'Le commentaire ne doit pas dépasser 500 caractères'),
})

export async function rejectRequest(
  requestId: string,
  comment: string
): Promise<ActionResponse<ValidationRequest>> {
  try {
    const validated = rejectRequestSchema.safeParse({ requestId, comment })
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

    const { data, error } = await supabase.rpc('reject_validation_request', {
      p_request_id: requestId,
      p_comment: comment,
      p_operator_id: operator.id,
    })

    if (error) {
      console.error('[VALIDATION-HUB:REJECT] Error:', error)
      return errorResponse('Erreur lors du refus', 'DB_ERROR', error)
    }

    return successResponse(toCamelCase(data) as ValidationRequest)
  } catch (err) {
    console.error('[VALIDATION-HUB:REJECT] Unexpected error:', err)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', err)
  }
}
