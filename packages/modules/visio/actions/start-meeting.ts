'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { type Meeting, type MeetingDB, StartMeetingInput } from '../types/meeting.types'
import { toMeeting } from '../utils/to-meeting'

export async function startMeeting(
  input: { meetingId: string }
): Promise<ActionResponse<Meeting>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = StartMeetingInput.safeParse(input)
    if (!parsed.success) {
      return errorResponse('meetingId invalide', 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { data: existing, error: findError } = await supabase
      .from('meetings')
      .select('id, status')
      .eq('id', parsed.data.meetingId)
      .single()

    if (findError || !existing) {
      return errorResponse('Meeting non trouvé', 'NOT_FOUND')
    }

    if (existing.status === 'in_progress') {
      return errorResponse('Meeting déjà en cours', 'CONFLICT')
    }

    if (existing.status === 'completed' || existing.status === 'cancelled') {
      return errorResponse('Meeting terminé ou annulé', 'CONFLICT')
    }

    const { data, error } = await supabase
      .from('meetings')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.meetingId)
      .select()
      .single()

    if (error || !data) {
      console.error('[VISIO:START_MEETING] DB update error:', error)
      return errorResponse('Erreur lors du démarrage du meeting', 'DB_ERROR', error)
    }

    return successResponse(toMeeting(data as MeetingDB))
  } catch (error) {
    console.error('[VISIO:START_MEETING] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
