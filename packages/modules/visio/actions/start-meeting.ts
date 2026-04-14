'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { type Meeting, type MeetingDB, StartMeetingInput } from '../types/meeting.types'
import { toMeeting } from '../utils/to-meeting'
import { getOpenViduToken } from './get-openvidu-token'

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

    // Vérifier que le meeting existe et n'est pas déjà démarré
    const { data: existing, error: findError } = await supabase
      .from('meetings')
      .select('id, status, session_id')
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

    // Obtenir token OpenVidu (crée la session si nécessaire)
    const tokenResult = await getOpenViduToken({ meetingId: parsed.data.meetingId })
    if (tokenResult.error || !tokenResult.data) {
      return errorResponse('Impossible de démarrer la session OpenVidu', 'OPENVIDU_ERROR', tokenResult.error)
    }

    // Start OpenVidu recording for this session (non-blocking)
    const openviduUrl = process.env.OPENVIDU_URL
    const openviduSecret = process.env.OPENVIDU_SECRET
    if (openviduUrl && openviduSecret) {
      const authHeader = `Basic ${Buffer.from(`OPENVIDUAPP:${openviduSecret}`).toString('base64')}`
      try {
        await fetch(`${openviduUrl}/openvidu/api/recordings/start`, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session: tokenResult.data.sessionId,
            outputMode: 'COMPOSED',
            hasAudio: true,
            hasVideo: true,
          }),
        })
      } catch (recordingErr) {
        console.error('[VISIO:START_SESSION] Recording start failed (non-blocking):', recordingErr)
      }
    }

    // Mettre à jour le meeting
    const { data, error } = await supabase
      .from('meetings')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
        session_id: tokenResult.data.sessionId,
      })
      .eq('id', parsed.data.meetingId)
      .select()
      .single()

    if (error || !data) {
      console.error('[VISIO:START_SESSION] DB update error:', error)
      return errorResponse('Erreur lors du démarrage du meeting', 'DB_ERROR', error)
    }

    return successResponse(toMeeting(data as MeetingDB))
  } catch (error) {
    console.error('[VISIO:START_SESSION] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
