'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { type MeetingRecording, type MeetingRecordingDB, GetMeetingRecordingsInput } from '../types/recording.types'
import { toMeetingRecording } from '../utils/to-meeting-recording'

export async function getMeetingRecordings(
  input: { meetingId: string }
): Promise<ActionResponse<MeetingRecording[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = GetMeetingRecordingsInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { data, error } = await supabase
      .from('meeting_recordings')
      .select('*')
      .eq('meeting_id', parsed.data.meetingId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[VISIO:GET_RECORDINGS] DB error:', error)
      return errorResponse('Erreur lors de la récupération des recordings', 'DB_ERROR', error)
    }

    return successResponse((data as MeetingRecordingDB[]).map(toMeetingRecording))
  } catch (error) {
    console.error('[VISIO:GET_RECORDINGS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
