'use client'

import { useState } from 'react'
import { Video, Clock, CheckCircle, Plus } from 'lucide-react'
import {
  MeetingRow,
  cancelMeeting,
  rescheduleMeeting,
  syncMeetingResults,
  startMeeting,
  type VisioRecipient,
} from '@monprojetpro/module-visio'
import {
  CockpitHeader,
  PillTabs,
  type PillTab,
  StatusPill,
} from '@monprojetpro/ui'
import { NewVisioDialog } from './new-visio-dialog'
import { endHubMeeting } from '../../../../actions/end-hub-meeting'
import { resendMeetLink } from '../../../../actions/resend-meet-link'
import { useRouter } from 'next/navigation'
import type { Meeting } from '@monprojetpro/module-visio'

type Tab = 'upcoming' | 'active' | 'history'

/* Définition des onglets — typage strict pour PillTabs */
const PILL_TABS: PillTab<Tab>[] = [
  { key: 'upcoming', label: 'À venir', icon: Clock },
  { key: 'active',   label: 'En cours', icon: Video },
  { key: 'history',  label: 'Historique', icon: CheckCircle },
]

/**
 * Destinataires proposés pour « Renvoyer le lien » — T-087.
 *
 * 🔑 Cette page liste les visios de TOUS les clients : elle n'a pas, comme le
 * dossier client, un carnet d'adresses sous la main. Le seul destinataire que
 * la visio connaît avec certitude est celui du dernier envoi. On le propose
 * donc, et rien d'autre : inventer une adresse enverrait un lien de rendez-vous
 * à côté, sans que personne ne s'en aperçoive.
 */
function recipientsFor(meeting: Meeting): VisioRecipient[] {
  if (!meeting.inviteLastSentTo) return []
  return [{ email: meeting.inviteLastSentTo, label: meeting.inviteLastSentTo }]
}

interface HubVisioClientProps {
  meetings: Meeting[]
  /** Non utilisé depuis T-061 (sendMeetLink résout l'opérateur via la session) — gardé pour ne pas casser `page.tsx`. */
  operatorId?: string
}

export function HubVisioClient({ meetings }: HubVisioClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('upcoming')
  const [dialogOpen, setDialogOpen] = useState(false)
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
        /* T-087 — une seule brique de ligne de visio, partagée avec le dossier
           client : rejoindre, copier, renvoyer, déplacer, annuler, démarrer,
           terminer, récupérer le compte rendu. Deux tableaux de boutons pour
           la même chose finissent toujours par diverger — et l'écran le moins
           servi devient celui où MiKL ne peut plus rien faire. */
        <div className="flex flex-col gap-3">
          {displayed.map((meeting) => {
            const destinataires = recipientsFor(meeting)
            return (
              <MeetingRow
                key={meeting.id}
                meeting={meeting}
                recipients={destinataires}
                /* Sans destinataire connu, « Renvoyer » ouvrirait une liste
                   déroulante vide et un bouton mort. On ne propose donc pas
                   l'action plutôt que d'offrir une coquille. */
                onResend={destinataires.length > 0 ? resendMeetLink : undefined}
                onCancel={cancelMeeting}
                onReschedule={rescheduleMeeting}
                onSyncResults={syncMeetingResults}
                onStart={startMeeting}
                onEnd={endHubMeeting}
                onChanged={() => router.refresh()}
              />
            )
          })}
        </div>
      )}

      {/* Dialog nouveau meeting — T-061 : même chemin de création que l'onglet
          Visio du dossier client (salle Google Meet réelle, email, toggle
          gratuit/payant), avec un sélecteur de client en plus puisqu'il n'y
          a pas de client fixe sur cette page. */}
      <NewVisioDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}
