'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { z } from 'zod'

const SyncMeetingResultsInput = z.object({
  meetingId: z.string().uuid('meetingId invalide'),
})

type TranscriptionState = 'FILE_GENERATED' | 'STARTED' | 'ENDED' | string

function mapTranscriptionStatus(
  state: TranscriptionState | undefined
): 'pending' | 'processing' | 'completed' | 'failed' {
  switch (state) {
    case 'FILE_GENERATED': return 'completed'
    case 'STARTED':
    case 'ENDED': return 'processing'
    case 'FAILED': return 'failed'
    default: return 'pending'
  }
}

interface ConferenceRecord { name: string }
interface GoogleRecording { driveDestination?: { exportUri?: string } }
interface GoogleTranscript { docsDestination?: { exportUri?: string }; state?: string }

export async function syncMeetingResults(
  input: { meetingId: string }
): Promise<ActionResponse<{ synced: boolean }>> {
  try {
    const parsed = SyncMeetingResultsInput.safeParse(input)
    if (!parsed.success) {
      return errorResponse('meetingId invalide', 'VALIDATION_ERROR', parsed.error.issues)
    }

    const supabase = await createServerSupabaseClient()

    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('meet_space_name')
      .eq('id', parsed.data.meetingId)
      .single()

    if (meetingError || !meeting?.meet_space_name) {
      return errorResponse('Meeting non trouvé ou sans espace Meet', 'NOT_FOUND')
    }

    const refreshToken = process.env.GOOGLE_MEET_REFRESH_TOKEN
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!refreshToken || !clientId || !clientSecret) {
      console.error('[VISIO:SYNC_RESULTS] Missing Google credentials')
      return errorResponse('Configuration Google Meet manquante', 'CONFIG_ERROR')
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!tokenRes.ok) {
      console.error('[VISIO:SYNC_RESULTS] Token refresh failed:', tokenRes.status)
      return errorResponse('Erreur authentification Google Meet', 'AUTH_ERROR')
    }

    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string }
    if (!tokenJson.access_token) {
      console.error('[VISIO:SYNC_RESULTS] Token response missing access_token:', tokenJson.error)
      return errorResponse('Token Google invalide ou révoqué', 'AUTH_ERROR')
    }
    const authHeaders = { Authorization: `Bearer ${tokenJson.access_token}` }

    const encodedFilter = encodeURIComponent(`space.name="${meeting.meet_space_name}"`)
    const conferenceListUrl = `https://meet.googleapis.com/v2/conferenceRecords?filter=${encodedFilter}`
    const conferenceRes = await fetch(conferenceListUrl, { headers: authHeaders })

    if (!conferenceRes.ok) {
      console.error('[VISIO:SYNC_RESULTS] conferenceRecords.list failed:', conferenceRes.status)
      return errorResponse('Erreur API conferenceRecords', 'API_ERROR')
    }

    const conferenceData = (await conferenceRes.json()) as {
      conferenceRecords?: ConferenceRecord[]
    }
    const conferenceRecordName = conferenceData.conferenceRecords?.[0]?.name

    if (!conferenceRecordName) {
      return successResponse({ synced: false })
    }

    const [recordingsRes, transcriptsRes] = await Promise.all([
      fetch(`https://meet.googleapis.com/v2/${conferenceRecordName}/recordings`, {
        headers: authHeaders,
      }),
      fetch(`https://meet.googleapis.com/v2/${conferenceRecordName}/transcripts`, {
        headers: authHeaders,
      }),
    ])

    const recordingData = recordingsRes.ok
      ? ((await recordingsRes.json()) as { recordings?: GoogleRecording[] })
      : { recordings: [] }

    const transcriptData = transcriptsRes.ok
      ? ((await transcriptsRes.json()) as { transcripts?: GoogleTranscript[] })
      : { transcripts: [] }

    const recordingUrl =
      recordingData.recordings?.[0]?.driveDestination?.exportUri ?? null
    const transcript = transcriptData.transcripts?.[0]
    const transcriptUrl = transcript?.docsDestination?.exportUri ?? null
    const transcriptionStatus = mapTranscriptionStatus(transcript?.state)

    if (!recordingUrl && !transcriptUrl) {
      return successResponse({ synced: false })
    }

    // Check if a recording row already exists for this meeting
    const { data: existing, error: existingError } = await supabase
      .from('meeting_recordings')
      .select('id, recording_url')
      .eq('meeting_id', parsed.data.meetingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // PGRST116 = no rows found — any other error is a real DB issue
    if (existingError && existingError.code !== 'PGRST116') {
      console.error('[VISIO:SYNC_RESULTS] Error checking existing recording:', existingError)
      return errorResponse('Erreur lecture enregistrement', 'DB_ERROR', existingError)
    }

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('meeting_recordings')
        .update({
          recording_url: recordingUrl ?? existing.recording_url,
          transcript_url: transcriptUrl,
          transcription_status: transcriptionStatus,
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error('[VISIO:SYNC_RESULTS] Update failed:', updateError)
        return errorResponse('Erreur mise à jour enregistrement', 'DB_ERROR', updateError)
      }
    } else {
      const { error: insertError } = await supabase.from('meeting_recordings').insert({
        meeting_id: parsed.data.meetingId,
        recording_url: recordingUrl ?? '',
        transcript_url: transcriptUrl,
        transcription_status: transcriptionStatus,
        recording_duration_seconds: 0,
        file_size_bytes: 0,
        transcription_language: 'fr',
      })

      if (insertError) {
        console.error('[VISIO:SYNC_RESULTS] Insert failed:', insertError)
        return errorResponse('Erreur insertion enregistrement', 'DB_ERROR', insertError)
      }
    }

    return successResponse({ synced: true })
  } catch (error) {
    console.error('[VISIO:SYNC_RESULTS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
