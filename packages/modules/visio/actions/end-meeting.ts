'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { type Meeting, type MeetingDB, EndMeetingInput } from '../types/meeting.types'
import { toMeeting } from '../utils/to-meeting'

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

    // Vérifier que le meeting est bien en cours
    const { data: existing, error: findError } = await supabase
      .from('meetings')
      .select('id, status, type, started_at, session_id')
      .eq('id', parsed.data.meetingId)
      .single()

    if (findError || !existing) {
      return errorResponse('Meeting non trouvé', 'NOT_FOUND')
    }

    if (existing.status !== 'in_progress') {
      return errorResponse('Meeting non actif', 'CONFLICT')
    }

    // Stop OpenVidu recording for this session (non-blocking)
    if (existing.session_id) {
      const openviduUrl = process.env.OPENVIDU_URL
      const openviduSecret = process.env.OPENVIDU_SECRET
      if (openviduUrl && openviduSecret) {
        const authHeader = `Basic ${Buffer.from(`OPENVIDUAPP:${openviduSecret}`).toString('base64')}`
        try {
          await fetch(`${openviduUrl}/openvidu/api/recordings/stop/${existing.session_id}`, {
            method: 'POST',
            headers: { Authorization: authHeader },
          })
        } catch (recordingErr) {
          console.error('[VISIO:END_SESSION] Recording stop failed (non-blocking):', recordingErr)
        }
      }
    }

    // Calculer durée
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
      console.error('[VISIO:END_SESSION] DB update error:', error)
      return errorResponse('Erreur lors de la fin du meeting', 'DB_ERROR', error)
    }

    return successResponse(toMeeting(data as MeetingDB))
  } catch (error) {
    console.error('[VISIO:END_SESSION] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
