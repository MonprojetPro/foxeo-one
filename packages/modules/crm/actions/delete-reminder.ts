'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

interface DeleteReminderInput {
  reminderId: string
}

export async function deleteReminder(
  input: DeleteReminderInput
): Promise<ActionResponse<{ success: true }>> {
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

    const { reminderId } = input

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(reminderId)) {
      return errorResponse(
        'ID de rappel invalide',
        'VALIDATION_ERROR'
      )
    }

    // Delete reminder (defense in depth: filter by operator_id too)
    const { error: deleteError } = await supabase
      .from('reminders')
      .delete()
      .eq('id', reminderId)
      .eq('operator_id', operator.id)

    if (deleteError) {
      console.error('[CRM:DELETE_REMINDER] Delete error:', deleteError)
      return errorResponse(
        'Impossible de supprimer le rappel',
        'DELETE_FAILED',
        deleteError
      )
    }

    console.log(`[CRM:DELETE_REMINDER] Reminder deleted: ${reminderId}`)

    return successResponse({ success: true })
  } catch (error) {
    console.error('[CRM:DELETE_REMINDER] Unexpected error:', error)
    return errorResponse(
      'Erreur interne',
      'INTERNAL_ERROR',
      error
    )
  }
}
