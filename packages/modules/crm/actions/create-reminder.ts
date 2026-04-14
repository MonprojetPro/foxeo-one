'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import type { Reminder, CreateReminderInput, ReminderDB } from '../types/crm.types'
import { CreateReminderInput as CreateReminderSchema } from '../types/crm.types'

export async function createReminder(
  input: CreateReminderInput
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

    const operatorId = operator.id

    // Server-side validation
    const parsed = CreateReminderSchema.safeParse(input)
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? 'Données invalides',
        'VALIDATION_ERROR',
        parsed.error.issues
      )
    }

    const { title, description, dueDate, clientId } = parsed.data

    // Insert reminder
    const { data: reminderData, error: insertError } = await supabase
      .from('reminders')
      .insert({
        operator_id: operatorId,
        client_id: clientId ?? null,
        title,
        description: description ?? null,
        due_date: dueDate,
        completed: false,
      })
      .select()
      .single()

    if (insertError || !reminderData) {
      console.error('[CRM:CREATE_REMINDER] Insert error:', insertError)
      return errorResponse(
        'Impossible de créer le rappel',
        'CREATE_FAILED',
        insertError
      )
    }

    // Transform snake_case → camelCase
    const reminder = toCamelCase<ReminderDB, Reminder>(reminderData as ReminderDB)

    console.log(`[CRM:CREATE_REMINDER] Reminder created: ${reminder.id}`)

    return successResponse(reminder)
  } catch (error) {
    console.error('[CRM:CREATE_REMINDER] Unexpected error:', error)
    return errorResponse(
      'Erreur interne',
      'INTERNAL_ERROR',
      error
    )
  }
}
