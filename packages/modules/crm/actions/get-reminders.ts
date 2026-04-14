'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import type { Reminder, ReminderDB, ReminderFilter } from '../types/crm.types'

interface GetRemindersOptions {
  filter?: ReminderFilter
  month?: number // 1-12
  year?: number
}

export async function getReminders(
  options: GetRemindersOptions = {}
): Promise<ActionResponse<Reminder[]>> {
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
    const { filter = 'all', month, year } = options

    // Base query - always filter by operator
    let query = supabase
      .from('reminders')
      .select('*')
      .eq('operator_id', operatorId)
      .order('due_date', { ascending: true })

    // Filter by month/year if provided
    if (month !== undefined && year !== undefined) {
      const startOfMonth = new Date(year, month - 1, 1).toISOString()
      const endOfMonth = new Date(year, month, 1).toISOString()

      query = query
        .gte('due_date', startOfMonth)
        .lt('due_date', endOfMonth)
    }

    // Execute query
    const { data: remindersData, error: fetchError } = await query

    if (fetchError) {
      console.error('[CRM:GET_REMINDERS] Fetch error:', fetchError)
      return errorResponse(
        'Impossible de récupérer les rappels',
        'FETCH_FAILED',
        fetchError
      )
    }

    if (!remindersData) {
      return successResponse([])
    }

    // Transform snake_case → camelCase
    const reminders = remindersData.map(r =>
      toCamelCase<ReminderDB, Reminder>(r as ReminderDB)
    )

    // Apply filter logic client-side (for completed/overdue)
    const now = new Date()
    const filteredReminders = reminders.filter(reminder => {
      switch (filter) {
        case 'upcoming':
          return !reminder.completed && new Date(reminder.dueDate) >= now
        case 'overdue':
          return !reminder.completed && new Date(reminder.dueDate) < now
        case 'completed':
          return reminder.completed
        case 'all':
        default:
          return true
      }
    })

    console.log(`[CRM:GET_REMINDERS] Fetched ${filteredReminders.length} reminders (filter: ${filter})`)

    return successResponse(filteredReminders)
  } catch (error) {
    console.error('[CRM:GET_REMINDERS] Unexpected error:', error)
    return errorResponse(
      'Erreur interne',
      'INTERNAL_ERROR',
      error
    )
  }
}
