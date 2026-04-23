'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { type Meeting, type MeetingDB, EndMeetingInput } from '../types/meeting.types'
import { toMeeting } from '../utils/to-meeting'
import { syncMeetingResults } from './sync-meeting-results'

export async function endMeeting(
  input: { meetingId: string }
): Promise<ActionResponse<Meeting>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = EndMeetingInput.safeParse(input)
    if (!parsed.success) {
      return errorResponse('meetingId invalide', 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { data: existing, error: findError } = await supabase
      .from('meetings')
      .select('id, status, started_at')
      .eq('id', parsed.data.meetingId)
      .single()

    if (findError || !existing) {
      return errorResponse('Meeting non trouvé', 'NOT_FOUND')
    }

    if (existing.status !== 'in_progress') {
      return errorResponse('Meeting non actif', 'CONFLICT')
    }

    const endedAt = new Date()
    const startedAt = existing.started_at ? new Date(existing.started_at) : endedAt
    const durationSeconds = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)

    const { data, error } = await supabase
      .from('meetings')
      .update({
        status: 'completed',
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq('id', parsed.data.meetingId)
      .select()
      .single()

    if (error || !data) {
      console.error('[VISIO:END_MEETING] DB update error:', error)
      return errorResponse('Erreur lors de la fin du meeting', 'DB_ERROR', error)
    }

    const meeting = toMeeting(data as MeetingDB)

    // Sync post-meeting results (non-blocking — Google Meet may take a few minutes)
    void syncMeetingResults({ meetingId: meeting.id }).catch((err) => {
      console.error('[VISIO:END_MEETING] syncMeetingResults background error:', err)
    })

    return successResponse(meeting)
  } catch (error) {
    console.error('[VISIO:END_MEETING] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
