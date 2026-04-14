'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import type { DeferClientInput } from '../types/crm.types'
import { DeferClientInput as DeferClientSchema } from '../types/crm.types'

export async function deferClient(
  input: DeferClientInput
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

    // Server-side validation
    const parsed = DeferClientSchema.safeParse(input)
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? 'Données invalides',
        'VALIDATION_ERROR',
        parsed.error.issues
      )
    }

    const { clientId, deferredUntil } = parsed.data

    // Validate date is not in the past (null means clear defer)
    if (deferredUntil) {
      const deferDate = new Date(deferredUntil)
      if (deferDate <= new Date()) {
        return errorResponse('La date de report doit être dans le futur', 'VALIDATION_ERROR')
      }
    }

    // Update deferred_until (RLS ensures operator owns this client)
    const { error: updateError } = await supabase
      .from('clients')
      .update({ deferred_until: deferredUntil })
      .eq('id', clientId)
      .eq('operator_id', operatorId) // Explicit check even though RLS enforces

    if (updateError) {
      console.error('[CRM:DEFER_CLIENT] Update error:', updateError)
      return errorResponse(
        'Impossible de reporter le client',
        'UPDATE_FAILED',
        updateError
      )
    }

    console.log(`[CRM:DEFER_CLIENT] Client ${clientId} deferred until ${deferredUntil ?? 'cleared'}`)

    return successResponse(undefined)
  } catch (error) {
    console.error('[CRM:DEFER_CLIENT] Unexpected error:', error)
    return errorResponse(
      'Erreur interne',
      'INTERNAL_ERROR',
      error
    )
  }
}
