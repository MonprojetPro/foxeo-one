import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { MeetingStatusBadge } from '@monprojetpro/module-visio'
import type { MeetingStatus } from '@monprojetpro/module-visio'
import { ExternalLink, FileVideo, Video, VideoOff } from 'lucide-react'
import { CockpitHeader, SectionTitle } from '@monprojetpro/ui'
import { MeetingDetailActions } from './meeting-detail-actions'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Props {
  params: Promise<{ meetingId: string }>
}

interface MeetingDetailRow {
  id: string
  title: string
  description: string | null
  scheduled_at: string | null
  started_at: string | null
  ended_at: string | null
  duration_seconds: number | null
  meet_uri: string | null
  status: MeetingStatus
  recording_url: string | null
  transcript_url: string | null
  clients: { name: string; company: string | null } | { name: string; company: string | null }[] | null
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso))
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

function getClientName(clients: MeetingDetailRow['clients']): string {
  if (!clients) return ''
  const c = Array.isArray(clients) ? clients[0] : clients
  if (!c) return ''
  return c.company || c.name || ''
}

export default async function HubMeetingDetailPage({ params }: Props) {
  const { meetingId } = await params

  if (!UUID_REGEX.test(meetingId)) notFound()

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, title, description, scheduled_at, started_at, ended_at, duration_seconds, meet_uri, status, recording_url, transcript_url, clients(name, company)')
    .eq('id', meetingId)
    .maybeSingle<MeetingDetailRow>()

  if (!meeting) notFound()

  const clientName = getClientName(meeting.clients)
  const isActive = meeting.status === 'scheduled' || meeting.status === 'in_progress'

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Fil d'Ariane */}
      <a href="/modules/visio" className="w-fit text-sm text-gray-400 transition-colors hover:text-gray-200">
        ← Retour aux meetings
      </a>

      {/* ── En-tête cockpit ── */}
      <CockpitHeader
        icon={Video}
        title={meeting.title}
        subtitle={clientName ? `Client : ${clientName}` : undefined}
        tone="cyan"
        status={<MeetingStatusBadge status={meeting.status} />}
        actions={<MeetingDetailActions meetingId={meeting.id} status={meeting.status} />}
      />

      {/* ── Fiche détails ── */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 flex flex-col gap-4">
        <SectionTitle>Informations</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Date prévue</p>
            <p className="text-sm text-white tabular-nums">{formatDate(meeting.scheduled_at)}</p>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Durée</p>
            <p className="text-sm text-white tabular-nums">{formatDuration(meeting.duration_seconds)}</p>
          </div>
          {meeting.started_at && (
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Démarré le</p>
              <p className="text-sm text-white tabular-nums">{formatDate(meeting.started_at)}</p>
            </div>
          )}
          {meeting.ended_at && (
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Terminé le</p>
              <p className="text-sm text-white tabular-nums">{formatDate(meeting.ended_at)}</p>
            </div>
          )}
        </div>
        {meeting.description && (
          <div className="flex flex-col gap-0.5 border-t border-white/10 pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Description</p>
            <p className="text-sm text-white/80 whitespace-pre-wrap">{meeting.description}</p>
          </div>
        )}
      </div>

      {/* ── Lien Google Meet (si meeting actif) ── */}
      {meeting.meet_uri && isActive ? (
        <a
          href={meeting.meet_uri}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
        >
          <ExternalLink className="h-4 w-4" />
          Rejoindre sur Google Meet
        </a>
      ) : isActive ? (
        /* Callout informatif quand aucun lien visio n'est disponible */
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-gray-400">
          <VideoOff className="h-4 w-4 shrink-0 text-gray-500" />
          Pas de lien visio pour ce meeting.
        </div>
      ) : null}

      {/* ── Actions post-meeting (enregistrements, transcription) ── */}
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={`/modules/visio/${meeting.id}/recordings`}
          className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.02] px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <FileVideo className="h-4 w-4" />
          Voir les enregistrements
        </a>
        {meeting.recording_url && (
          <a
            href={meeting.recording_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-200"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Enregistrement
          </a>
        )}
        {meeting.transcript_url && (
          <a
            href={meeting.transcript_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-200"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Transcription
          </a>
        )}
      </div>
    </div>
  )
}
