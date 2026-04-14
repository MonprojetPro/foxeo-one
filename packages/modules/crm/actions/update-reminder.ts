'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import type { Reminder, UpdateReminderInput, ReminderDB } from '../types/crm.types'
import { UpdateReminderInput as UpdateReminderSchema } from '../types/crm.types'

export async function updateReminder(
  input: UpdateReminderInput
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

    // Lookup operator record (operators.id ≠ auth.uid())
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    // Server-side validation
    const parsed = UpdateReminderSchema.safeParse(input)
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? 'Données invalides',
        'VALIDATION_ERROR',
        parsed.error.issues
      )
    }

    const { reminderId, title, description, dueDate } = parsed.data

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}

    if (title !== undefined) {
      updateData.title = title
    }

    if (description !== undefined) {
      updateData.description = description
    }

    if (dueDate !== undefined) {
      updateData.due_date = dueDate
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return errorResponse(
        'Aucune donnée à modifier',
        'VALIDATION_ERROR'
      )
    }

    // Update reminder (defense in depth: filter by operator_id too)
    const { data: reminderData, error: updateError } = await supabase
      .from('reminders')
      .update(updateData)
      .eq('id', reminderId)
      .eq('operator_id', operator.id)
      .select()
      .single()

    if (updateError || !reminderData) {
      console.error('[CRM:UPDATE_REMINDER] Update error:', updateError)
      return errorResponse(
        'Impossible de modifier le rappel',
        'UPDATE_FAILED',
        updateError
      )
    }

    // Transform snake_case → camelCase
    const reminder = toCamelCase<ReminderDB, Reminder>(reminderData as ReminderDB)

    console.log(`[CRM:UPDATE_REMINDER] Reminder updated: ${reminderId}`)

    return successResponse(reminder)
  } catch (error) {
    console.error('[CRM:UPDATE_REMINDER] Unexpected error:', error)
    return errorResponse(
      'Erreur interne',
      'INTERNAL_ERROR',
      error
    )
  }
}
