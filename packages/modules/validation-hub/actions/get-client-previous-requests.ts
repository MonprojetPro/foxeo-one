'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import type {
  ValidationRequestType,
  ValidationRequestStatus,
  ValidationRequestSummary,
} from '../types/validation.types'

export async function getClientPreviousRequests(
  clientId: string,
  excludeRequestId: string
): Promise<ActionResponse<ValidationRequestSummary[]>> {
  try {
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

    const { data, error } = await supabase
      .from('validation_requests')
      .select('id, title, type, status, submitted_at')
      .eq('client_id', clientId)
      .eq('operator_id', operator.id)
      .neq('id', excludeRequestId)
      .order('submitted_at', { ascending: false })
      .limit(3)

    if (error) {
      console.error(
        '[VALIDATION-HUB:GET_PREVIOUS_REQUESTS] Supabase error:',
        error
      )
      return errorResponse(
        'Impossible de charger les demandes précédentes',
        'DATABASE_ERROR',
        error
      )
    }

    const requests: ValidationRequestSummary[] = (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      type: row.type as ValidationRequestType,
      status: row.status as ValidationRequestStatus,
      submittedAt: row.submitted_at,
    }))

    return successResponse(requests)
  } catch (error) {
    console.error(
      '[VALIDATION-HUB:GET_PREVIOUS_REQUESTS] Unexpected error:',
      error
    )
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}
