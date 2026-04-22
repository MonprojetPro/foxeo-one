'use client'

import { useState, useTransition } from 'react'
import { ExternalLink, Video, Clock, CheckCircle, Plus } from 'lucide-react'
import { MeetingStatusBadge, MeetingScheduleDialog } from '@monprojetpro/module-visio'
import { createHubMeeting } from '../../../../actions/create-hub-meeting'
import { endHubMeeting } from '../../../../actions/end-hub-meeting'
import { startMeeting } from '@monprojetpro/module-visio'
import { useRouter } from 'next/navigation'
import type { Meeting } from '@monprojetpro/module-visio'

const TABS = [
  { id: 'upcoming', label: 'À venir', icon: Clock },
  { id: 'active', label: 'En cours', icon: Video },
  { id: 'history', label: 'Historique', icon: CheckCircle },
] as const

type Tab = typeof TABS[number]['id']

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
  const active = meetings.filter((m) => m.status === 'in_progress')
  const history = meetings.filter((m) => m.status === 'completed' || m.status === 'cancelled')

  const tabMeetings: Record<Tab, Meeting[]> = { upcoming, active, history }
  const displayed = tabMeetings[activeTab]

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

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Visio</h1>
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nouveau meeting
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10">
        {TABS.map((tab) => {
          const count = tabMeetings[tab.id].length
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {count > 0 && (
                <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">Aucun meeting dans cet onglet</p>
          {activeTab === 'upcoming' && (
            <button
              onClick={() => setDialogOpen(true)}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Créer le premier meeting
            </button>
          )}
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="pb-3 pr-4 font-medium text-muted-foreground">Titre</th>
                <th className="pb-3 pr-4 font-medium text-muted-foreground">Date</th>
                <th className="pb-3 pr-4 font-medium text-muted-foreground">Statut</th>
                <th className="pb-3 pr-4 font-medium text-muted-foreground">Durée</th>
                <th className="pb-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((meeting) => (
                <tr key={meeting.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 pr-4 font-medium">{meeting.title}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{formatDate(meeting.scheduledAt)}</td>
                  <td className="py-3 pr-4">
                    <MeetingStatusBadge status={meeting.status} />
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{formatDuration(meeting.durationSeconds)}</td>
                  <td className="py-3">
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
                          className="inline-flex items-center gap-1 rounded-md border border-white/20 px-3 py-1 text-xs font-medium hover:bg-white/10 disabled:opacity-50"
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
