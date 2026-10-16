/**
 * Récupération des résultats d'une visio Google Meet — enregistrement,
 * transcription, puis dépôt dans le dossier du client (T-050).
 *
 * 🔑 POURQUOI CE CŒUR EST SÉPARÉ DE LA SERVER ACTION. Deux appelants, deux
 * identités : la Server Action tourne sous la session de MiKL (RLS active), le
 * cron de rattrapage tourne sans session (clé de service). Un cœur qui reçoit
 * son client Supabase sert les deux sans dupliquer un gramme de logique Google.
 *
 * 🔑 POURQUOI LE MIROIR VERS `meetings`. Trois écrans sur quatre lisent
 * `meetings.recording_url` / `meetings.transcript_url` — l'onglet Visio du
 * dossier client, la page détail du Hub, la page détail de l'app client — et
 * **personne n'écrivait jamais ces deux colonnes** (vérifié par grep sur tout
 * le dépôt le 16-10). La synchro remplissait `meeting_recordings`, que seule la
 * page `/recordings` consulte. C'est la leçon du consumer oublié : une donnée
 * écrite quelque part que l'écran ne lit pas n'existe pas pour l'utilisateur.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  extractGoogleDocsText,
  parseGoogleDocumentId,
  TRANSCRIPT_TEXT_MAX_LENGTH,
} from '../utils/google-docs-text'
import { archiveTranscriptToClientFolder } from './transcript-archive'

export type SyncReason =
  | 'ok'
  | 'not_found'
  | 'no_space'
  | 'config_missing'
  | 'auth_error'
  | 'api_error'
  | 'not_ready'
  | 'db_error'

export interface MeetingSyncOutcome {
  /** Au moins une information (enregistrement ou transcription) a été écrite. */
  synced: boolean
  /** Google a terminé la transcription. */
  transcriptReady: boolean
  /** Le compte rendu a été déposé dans le dossier du client lors de CET appel. */
  archived: boolean
  documentId: string | null
  reason: SyncReason
}

interface MeetingRow {
  id: string
  client_id: string | null
  operator_id: string
  title: string
  scheduled_at: string | null
  ended_at: string | null
  meet_space_name: string | null
  metadata: Record<string, unknown> | null
}

interface GoogleRecording {
  driveDestination?: { exportUri?: string }
}

interface GoogleTranscript {
  docsDestination?: { document?: string; exportUri?: string }
  state?: string
}

function mapTranscriptionStatus(
  state: string | undefined
): 'pending' | 'processing' | 'completed' | 'failed' {
  switch (state) {
    case 'FILE_GENERATED':
      return 'completed'
    case 'STARTED':
    case 'ENDED':
      return 'processing'
    case 'FAILED':
      return 'failed'
    default:
      return 'pending'
  }
}

function outcome(reason: SyncReason, partial: Partial<MeetingSyncOutcome> = {}): MeetingSyncOutcome {
  return {
    synced: false,
    transcriptReady: false,
    archived: false,
    documentId: null,
    reason,
    ...partial,
  }
}

/** Jeton d'accès Google à partir du refresh token de service (scope Hub). */
export async function getGoogleAccessToken(): Promise<
  { ok: true; accessToken: string } | { ok: false; reason: 'config_missing' | 'auth_error' }
> {
  const refreshToken = process.env.GOOGLE_MEET_REFRESH_TOKEN
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!refreshToken || !clientId || !clientSecret) {
    console.error('[VISIO:SYNC] Identifiants Google absents')
    return { ok: false, reason: 'config_missing' }
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!res.ok) {
    console.error('[VISIO:SYNC] Rafraîchissement du jeton refusé:', res.status)
    return { ok: false, reason: 'auth_error' }
  }

  const json = (await res.json()) as { access_token?: string; error?: string }
  if (!json.access_token) {
    console.error('[VISIO:SYNC] Réponse sans access_token:', json.error)
    return { ok: false, reason: 'auth_error' }
  }
  return { ok: true, accessToken: json.access_token }
}

/** Texte du transcript via l'API Google Docs. Best-effort : null si refusé. */
async function fetchTranscriptText(
  documentId: string,
  accessToken: string
): Promise<string | null> {
  try {
    const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      console.warn(
        `[VISIO:SYNC] Google Docs ${res.status} — texte non récupéré (scope documents.readonly manquant ?). L'URL reste stockée.`
      )
      return null
    }
    return extractGoogleDocsText(await res.json(), TRANSCRIPT_TEXT_MAX_LENGTH)
  } catch (err) {
    console.warn('[VISIO:SYNC] Lecture Google Docs impossible:', err)
    return null
  }
}

/**
 * Trace l'état du rattrapage dans `meetings.metadata.transcript_sync`.
 * Même pattern que `metadata.reminder_sent_at` du cron de rappel : pas de
 * table dédiée pour quatre champs, et la trace survit à l'absence de ligne
 * `meeting_recordings`.
 */
async function recordSyncAttempt(
  supabase: SupabaseClient,
  meeting: MeetingRow,
  reason: SyncReason,
  extra: Record<string, unknown> = {},
  /**
   * URL à recopier dans `meetings` — LA donnée que les écrans lisent.
   * Volontairement écrite dans la MÊME requête que la trace : en deux
   * requêtes, un échec entre les deux laisserait l'écran et l'état du
   * rattrapage se contredire, et c'est précisément ce genre d'écart qui finit
   * par faire dire à l'interface le contraire de la réalité.
   */
  mirror?: { recording_url: string | null; transcript_url: string | null }
): Promise<void> {
  const metadata = (meeting.metadata ?? {}) as Record<string, unknown>
  const previous = (metadata.transcript_sync ?? {}) as Record<string, unknown>
  const attempts = typeof previous.attempts === 'number' ? previous.attempts + 1 : 1

  const { error } = await supabase
    .from('meetings')
    .update({
      ...(mirror ?? {}),
      metadata: {
        ...metadata,
        transcript_sync: {
          ...previous,
          attempts,
          lastAttemptAt: new Date().toISOString(),
          lastReason: reason,
          ...extra,
        },
      },
    })
    .eq('id', meeting.id)

  if (error) console.error('[VISIO:SYNC] Trace de tentative non écrite:', error.message)
}

export async function syncMeetingResultsCore(
  supabase: SupabaseClient,
  meetingId: string
): Promise<MeetingSyncOutcome> {
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('id, client_id, operator_id, title, scheduled_at, ended_at, meet_space_name, metadata')
    .eq('id', meetingId)
    .maybeSingle<MeetingRow>()

  if (meetingError || !meeting) return outcome('not_found')
  if (!meeting.meet_space_name) return outcome('no_space')

  const token = await getGoogleAccessToken()
  if (!token.ok) {
    await recordSyncAttempt(supabase, meeting, token.reason)
    return outcome(token.reason)
  }
  const authHeaders = { Authorization: `Bearer ${token.accessToken}` }

  const filter = encodeURIComponent(`space.name="${meeting.meet_space_name}"`)
  const conferenceRes = await fetch(
    `https://meet.googleapis.com/v2/conferenceRecords?filter=${filter}`,
    { headers: authHeaders }
  )

  if (!conferenceRes.ok) {
    console.error('[VISIO:SYNC] conferenceRecords.list échoué:', conferenceRes.status)
    await recordSyncAttempt(supabase, meeting, 'api_error')
    return outcome('api_error')
  }

  const conferenceData = (await conferenceRes.json()) as {
    conferenceRecords?: Array<{ name: string }>
  }
  const conferenceRecordName = conferenceData.conferenceRecords?.[0]?.name

  if (!conferenceRecordName) {
    // Cas NORMAL dans les minutes qui suivent la visio : Google n'a pas encore
    // publié le compte rendu de conférence. C'est précisément ce que le cron
    // de rattrapage est là pour réessayer.
    await recordSyncAttempt(supabase, meeting, 'not_ready')
    return outcome('not_ready')
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

  const recordingUrl = recordingData.recordings?.[0]?.driveDestination?.exportUri ?? null
  const transcript = transcriptData.transcripts?.[0]
  const transcriptUrl = transcript?.docsDestination?.exportUri ?? null
  const transcriptionStatus = mapTranscriptionStatus(transcript?.state)
  const transcriptReady = transcriptionStatus === 'completed'

  if (!recordingUrl && !transcriptUrl) {
    await recordSyncAttempt(supabase, meeting, 'not_ready')
    return outcome('not_ready')
  }

  const googleDocumentId = transcriptReady
    ? parseGoogleDocumentId({
        document: transcript?.docsDestination?.document ?? null,
        exportUri: transcriptUrl,
      })
    : null

  const transcriptText = googleDocumentId
    ? await fetchTranscriptText(googleDocumentId, token.accessToken)
    : null

  const transcriptTextFields = transcriptText
    ? { transcript_text: transcriptText, transcript_synced_at: new Date().toISOString() }
    : {}

  // ── Ligne meeting_recordings : création ou mise à jour ──
  const { data: existing, error: existingError } = await supabase
    .from('meeting_recordings')
    .select('id, recording_url, transcript_document_id')
    .eq('meeting_id', meeting.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; recording_url: string; transcript_document_id: string | null }>()

  if (existingError) {
    console.error('[VISIO:SYNC] Lecture meeting_recordings échouée:', existingError.message)
    await recordSyncAttempt(supabase, meeting, 'db_error')
    return outcome('db_error')
  }

  let recordingId = existing?.id ?? null
  let alreadyArchived = Boolean(existing?.transcript_document_id)

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('meeting_recordings')
      .update({
        recording_url: recordingUrl ?? existing.recording_url,
        transcript_url: transcriptUrl,
        transcription_status: transcriptionStatus,
        ...transcriptTextFields,
      })
      .eq('id', existing.id)

    if (updateError) {
      console.error('[VISIO:SYNC] Mise à jour meeting_recordings échouée:', updateError.message)
      await recordSyncAttempt(supabase, meeting, 'db_error')
      return outcome('db_error')
    }
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from('meeting_recordings')
      .insert({
        meeting_id: meeting.id,
        recording_url: recordingUrl ?? '',
        transcript_url: transcriptUrl,
        transcription_status: transcriptionStatus,
        recording_duration_seconds: 0,
        file_size_bytes: 0,
        transcription_language: 'fr',
        ...transcriptTextFields,
      })
      .select('id')
      .single()

    if (insertError || !inserted) {
      console.error('[VISIO:SYNC] Insertion meeting_recordings échouée:', insertError?.message)
      await recordSyncAttempt(supabase, meeting, 'db_error')
      return outcome('db_error')
    }
    recordingId = inserted.id as string
    alreadyArchived = false
  }

  // ── Dépôt dans le dossier du client ──
  let archived = false
  let documentId: string | null = null
  let archiveNote: Record<string, unknown> = {}

  if (transcriptReady && !alreadyArchived && recordingId) {
    if (!meeting.client_id) {
      // Visio sans client rattaché (prospect contacté hors fiche) : il n'y a
      // pas de dossier où déposer. On le DIT au lieu de le taire.
      archiveNote = { archiveSkipped: 'no_client' }
    } else {
      const result = await archiveTranscriptToClientFolder(supabase, {
        meetingId: meeting.id,
        clientId: meeting.client_id,
        operatorId: meeting.operator_id,
        meetingTitle: meeting.title,
        meetingDateIso: meeting.ended_at ?? meeting.scheduled_at,
        recordingId,
        googleDocumentId,
        transcriptText,
        accessToken: token.accessToken,
      })

      if (result.ok) {
        archived = true
        documentId = result.result.documentId
        archiveNote = {
          archivedAt: new Date().toISOString(),
          archiveFormat: result.result.format,
          archiveDocumentId: result.result.documentId,
          archiveSkipped: null,
        }
      } else {
        archiveNote = { archiveSkipped: result.reason, archiveError: result.detail ?? null }
        console.error('[VISIO:SYNC] Dépôt du compte rendu échoué:', result.reason, result.detail)
      }
    }
  }

  // `done` dit au cron qu'il n'y a plus rien à attendre de cette visio. Sans
  // ce drapeau, il relancerait la même synchro toutes les 15 minutes pendant
  // 24 h sur un compte rendu déjà déposé — du travail pour rien, et des
  // appels Google pour rien.
  const done =
    transcriptReady &&
    (archived ||
      alreadyArchived ||
      archiveNote.archiveSkipped === 'no_client' ||
      archiveNote.archiveSkipped === 'already_archived')

  await recordSyncAttempt(
    supabase,
    meeting,
    'ok',
    { transcriptReady, done, ...archiveNote },
    { recording_url: recordingUrl, transcript_url: transcriptUrl }
  )

  return {
    synced: true,
    transcriptReady,
    archived,
    documentId,
    reason: 'ok',
  }
}
