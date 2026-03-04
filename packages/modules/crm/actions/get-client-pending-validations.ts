'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@foxeo/types'

export async function getClientPendingValidationsCount(
  clientId: string
): Promise<ActionResponse<{ count: number }>> {
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
      .from('validation_requests')
      .select('id')
      .eq('client_id', clientId)
      .eq('status', 'pending')

    if (error) {
      console.error('[CRM:GET_PENDING_VALIDATIONS] Error:', error)
      return errorResponse('Erreur lors du chargement des validations', 'DATABASE_ERROR', error)
    }

    return successResponse({ count: data?.length ?? 0 })
  } catch (error) {
    console.error('[CRM:GET_PENDING_VALIDATIONS] Unexpected error:', error)
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', error)
  }
}
