'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

export async function togglePinClient(
  clientId: string,
  isPinned: boolean
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createServerSupabaseClient()

    // Auth check
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Lookup operator record (operators.id ≠ auth.uid())
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    const operatorId = operator.id

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(clientId)) {
      return errorResponse('ID de client invalide', 'VALIDATION_ERROR')
    }

    // Update is_pinned (RLS ensures operator owns this client)
    const { error: updateError } = await supabase
      .from('clients')
      .update({ is_pinned: isPinned })
      .eq('id', clientId)
      .eq('operator_id', operatorId) // Explicit check even though RLS enforces

    if (updateError) {
      console.error('[CRM:TOGGLE_PIN] Update error:', updateError)
      return errorResponse(
        'Impossible de modifier l\'épinglage',
        'UPDATE_FAILED',
        updateError
      )
    }

    console.log(`[CRM:TOGGLE_PIN] Client ${clientId} pinned=${isPinned}`)

    return successResponse(undefined)
  } catch (error) {
    console.error('[CRM:TOGGLE_PIN] Unexpected error:', error)
    return errorResponse(
      'Erreur interne',
      'INTERNAL_ERROR',
      error
    )
  }
}
