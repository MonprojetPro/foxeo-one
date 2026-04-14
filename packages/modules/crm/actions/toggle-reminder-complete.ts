'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import type { Reminder, ToggleReminderCompleteInput, ReminderDB } from '../types/crm.types'
import { ToggleReminderCompleteInput as ToggleReminderCompleteSchema } from '../types/crm.types'

export async function toggleReminderComplete(
  input: ToggleReminderCompleteInput
): Promise<ActionResponse<Reminder>> {
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

    // Server-side validation
    const parsed = ToggleReminderCompleteSchema.safeParse(input)
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? 'Données invalides',
        'VALIDATION_ERROR',
        parsed.error.issues
      )
    }

    const { reminderId } = parsed.data

    // Atomic toggle via RPC — single DB call, no race condition
    const { data: reminderData, error: updateError } = await supabase
      .rpc('toggle_reminder_completed', { p_reminder_id: reminderId })
      .single()

    if (updateError || !reminderData) {
      console.error('[CRM:TOGGLE_REMINDER] Toggle error:', updateError)
      const isNotFound = updateError?.code === 'PGRST116'
      return errorResponse(
        isNotFound ? 'Rappel introuvable' : 'Impossible de modifier le rappel',
        isNotFound ? 'NOT_FOUND' : 'UPDATE_FAILED',
        updateError
      )
    }

    if (updateError || !reminderData) {
      console.error('[CRM:TOGGLE_REMINDER] Update error:', updateError)
      return errorResponse(
        'Impossible de modifier le rappel',
        'UPDATE_FAILED',
        updateError
      )
    }

    // Transform snake_case → camelCase
    const reminder = toCamelCase<ReminderDB, Reminder>(reminderData as ReminderDB)

    console.log(`[CRM:TOGGLE_REMINDER] Reminder ${reminderId} toggled to completed=${reminder.completed}`)

    return successResponse(reminder)
  } catch (error) {
    console.error('[CRM:TOGGLE_REMINDER] Unexpected error:', error)
    return errorResponse(
      'Erreur interne',
      'INTERNAL_ERROR',
      error
    )
  }
}
