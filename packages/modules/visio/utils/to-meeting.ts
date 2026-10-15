import type { Meeting, MeetingDB } from '../types/meeting.types'

export function toMeeting(db: MeetingDB): Meeting {
  return {
    id: db.id,
    clientId: db.client_id ?? null,
    operatorId: db.operator_id,
    title: db.title,
    description: db.description,
    scheduledAt: db.scheduled_at,
    startedAt: db.started_at,
    endedAt: db.ended_at,
    durationSeconds: db.duration_seconds,
    meetSpaceName: db.meet_space_name ?? null,
    meetUri: db.meet_uri ?? null,
    status: db.status,
    type: db.type ?? 'standard',
    metadata: db.metadata ?? {},
    recordingUrl: db.recording_url,
    transcriptUrl: db.transcript_url,
    // T-056 — LE MAILLON QU'ON AVAIT OUBLIÉ SUR LES FACTURES : une colonne
    // écrite mais jamais lue laisse l'écran afficher « jamais envoyé » pour
    // toujours, et la garde anti-double-envoi ne garde alors plus rien.
    inviteLastSentAt: db.invite_last_sent_at ?? null,
    inviteLastSentTo: db.invite_last_sent_to ?? null,
    inviteSentCount: db.invite_sent_count ?? 0,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}
