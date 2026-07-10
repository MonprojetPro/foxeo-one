'use client'

import { useState, useTransition } from 'react'
import { ExternalLink, Video, Clock, CheckCircle, Plus } from 'lucide-react'
import { MeetingStatusBadge, MeetingScheduleDialog } from '@monprojetpro/module-visio'
import {
  CockpitHeader,
  PillTabs,
  type PillTab,
  StatusPill,
} from '@monprojetpro/ui'
import { createHubMeeting } from '../../../../actions/create-hub-meeting'
import { endHubMeeting } from '../../../../actions/end-hub-meeting'
import { startMeeting } from '@monprojetpro/module-visio'
import { useRouter } from 'next/navigation'
import type { Meeting } from '@monprojetpro/module-visio'

type Tab = 'upcoming' | 'active' | 'history'

/* Définition des onglets — typage strict pour PillTabs */
const PILL_TABS: PillTab<Tab>[] = [
  { key: 'upcoming', label: 'À venir', icon: Clock },
  { key: 'active',   label: 'En cours', icon: Video },
  { key: 'history',  label: 'Historique', icon: CheckCircle },
]

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

interface HubVisioClientProps {
  meetings: Meeting[]
  operatorId: string
}

export function HubVisioClient({ meetings, operatorId }: HubVisioClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('upcoming')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const upcoming = meetings.filter((m) => m.status === 'scheduled')
  const active   = meetings.filter((m) => m.status === 'in_progress')
  const history  = meetings.filter((m) => m.status === 'completed' || m.status === 'cancelled')

  const tabMeetings: Record<Tab, Meeting[]> = { upcoming, active, history }
  const displayed = tabMeetings[activeTab]

  /* Injecte les compteurs dans les pills */
  const tabs = PILL_TABS.map((t) => ({
    ...t,
    count: tabMeetings[t.key].length,
  }))

  function handleEnd(meetingId: string) {
    startTransition(async () => {
      await endHubMeeting({ meetingId })
      router.refresh()
    })
  }

  function handleStart(meetingId: string) {
    startTransition(async () => {
      await startMeeting({ meetingId })
      router.refresh()
    })
  }

  /* Indicateur de statut : meeting actif = live */
  const liveStatus = active.length > 0
    ? <StatusPill state="live" label={`${active.length} en cours`} />
    : undefined

  return (
    <>
      {/* ── En-tête cockpit ── */}
      <CockpitHeader
        icon={Video}
        title="Visio"
        subtitle="Planifiez et pilotez vos sessions vidéo clients"
        tone="cyan"
        status={liveStatus}
        actions={
          <button
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-400/20"
          >
            <Plus className="h-4 w-4" />
            Nouveau meeting
          </button>
        }
      />

      {/* ── Navigation pills ── */}
      <PillTabs
        tabs={tabs}
        active={activeTab}
        onChange={setActiveTab}
        tone="cyan"
      />

      {/* ── Contenu de l'onglet actif ── */}
      {displayed.length === 0 ? (
        /* État vide cockpit */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <p className="text-sm text-gray-400">Aucun meeting dans cet onglet</p>
          {activeTab === 'upcoming' && (
            <button
              onClick={() => setDialogOpen(true)}
              className="mt-4 text-sm text-cyan-400 hover:underline"
            >
              Créer le premier meeting
            </button>
          )}
        </div>
      ) : (
        /* Table — mobile : cartes / desktop : table */
        <>
          {/* Cartes mobiles */}
          <div className="flex flex-col gap-3 sm:hidden">
            {displayed.map((meeting) => (
              <div
                key={meeting.id}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-white truncate">{meeting.title}</span>
                  <MeetingStatusBadge status={meeting.status} />
                </div>
                <p className="text-xs text-gray-500 tabular-nums">{formatDate(meeting.scheduledAt)}</p>
                {meeting.durationSeconds !== null && (
                  <p className="text-xs text-gray-500 tabular-nums">{formatDuration(meeting.durationSeconds)}</p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  {meeting.meetUri && meeting.status !== 'completed' && meeting.status !== 'cancelled' && (
                    <a
                      href={meeting.meetUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Rejoindre
                    </a>
                  )}
                  {meeting.status === 'scheduled' && (
                    <button
                      onClick={() => handleStart(meeting.id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1 rounded-md border border-white/20 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-white/10 disabled:opacity-50"
                    >
                      Démarrer
                    </button>
                  )}
                  {meeting.status === 'in_progress' && (
                    <button
                      onClick={() => handleEnd(meeting.id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1 rounded-md border border-red-500/40 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      Terminer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Table desktop */}
          <div className="hidden sm:block w-full overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="px-4 pb-3 pt-4 text-xs font-medium uppercase tracking-wide text-gray-400">Titre</th>
                  <th className="px-4 pb-3 pt-4 text-xs font-medium uppercase tracking-wide text-gray-400">Date</th>
                  <th className="px-4 pb-3 pt-4 text-xs font-medium uppercase tracking-wide text-gray-400">Statut</th>
                  <th className="px-4 pb-3 pt-4 text-xs font-medium uppercase tracking-wide text-gray-400">Durée</th>
                  <th className="px-4 pb-3 pt-4 text-xs font-medium uppercase tracking-wide text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((meeting) => (
                  <tr key={meeting.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-medium text-white">{meeting.title}</td>
                    <td className="px-4 py-3 text-gray-400 tabular-nums">{formatDate(meeting.scheduledAt)}</td>
                    <td className="px-4 py-3">
                      <MeetingStatusBadge status={meeting.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 tabular-nums">{formatDuration(meeting.durationSeconds)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {meeting.meetUri && meeting.status !== 'completed' && meeting.status !== 'cancelled' && (
                          <a
                            href={meeting.meetUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Rejoindre
                          </a>
                        )}
                        {meeting.status === 'scheduled' && (
                          <button
                            onClick={() => handleStart(meeting.id)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 rounded-md border border-white/20 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-white/10 disabled:opacity-50"
                          >
                            Démarrer
                          </button>
                        )}
                        {meeting.status === 'in_progress' && (
                          <button
                            onClick={() => handleEnd(meeting.id)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 rounded-md border border-red-500/40 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            Terminer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Dialog nouveau meeting — clientId optionnel depuis le Hub */}
      <MeetingScheduleDialog
        operatorId={operatorId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => router.refresh()}
        createMeetingAction={createHubMeeting}
      />
    </>
  )
}
