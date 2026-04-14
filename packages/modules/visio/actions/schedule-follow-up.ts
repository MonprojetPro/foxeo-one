'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { ScheduleFollowUpInput } from './post-meeting-schemas'
export type { ScheduleFollowUpInput } from './post-meeting-schemas'

export interface FollowUpResult {
  reminderId: string
}

export async function scheduleFollowUp(
  input: ScheduleFollowUpInput
): Promise<ActionResponse<FollowUpResult>> {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

  const parsed = ScheduleFollowUpInput.safeParse(input)
  if (!parsed.success) {
    return errorResponse('Données invalides', 'VALIDATION_ERROR', parsed.error.issues)
  }

  const { meetingId, dueDate, message } = parsed.data

  // Récupérer operator_id
  const { data: operator, error: operatorError } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (operatorError || !operator) {
    return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
  }

  // Récupérer client_id depuis le meeting
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('client_id')
    .eq('id', meetingId)
    .single()

  if (meetingError || !meeting) {
    return errorResponse('Meeting non trouvé', 'NOT_FOUND')
  }

  // Créer reminder
  const { data: reminder, error: reminderError } = await supabase
    .from('reminders')
    .insert({
      operator_id: operator.id,
      client_id: meeting.client_id,
      title: 'Rappel prospect post-visio',
      description: message,
      due_date: dueDate,
    })
    .select('id')
    .single()

  if (reminderError || !reminder) {
    console.error('[VISIO:POST_MEETING] Reminder creation failed:', reminderError)
    return errorResponse('Échec création rappel', 'DATABASE_ERROR', reminderError)
  }

  console.log('[VISIO:POST_MEETING] Rappel créé:', reminder.id)

  return successResponse({ reminderId: reminder.id })
}
