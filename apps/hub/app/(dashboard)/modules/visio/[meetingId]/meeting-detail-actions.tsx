'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { startMeeting, syncMeetingResults } from '@monprojetpro/module-visio'
import { showError, showSuccess } from '@monprojetpro/ui'
import { RefreshCw } from 'lucide-react'
import { endHubMeeting } from '../../../../../actions/end-hub-meeting'
import type { MeetingStatus } from '@monprojetpro/module-visio'

interface MeetingDetailActionsProps {
  meetingId: string
  status: MeetingStatus
  /**
   * Calculé côté serveur par `canSyncMeetingResults` : salle Google Meet
   * présente, rendez-vous non annulé, et heure prévue passée.
   *
   * ⚠️ NE PAS reconditionner ce bouton sur `status === 'completed'` : rien
   * n'écrit jamais ce statut tant que la synchro n'a pas lu l'horaire réel
   * chez Google. C'est le défaut constaté par MiKL le 16-10 — il avait fait
   * une vraie visio, raccroché, et aucun bouton n'apparaissait.
   */
  canSync?: boolean
}

const BUTTON_CLASS =
  'inline-flex items-center gap-1 rounded-md border border-white/20 px-3 py-1.5 text-xs font-medium hover:bg-white/10 disabled:opacity-50'

export function MeetingDetailActions({
  meetingId,
  status,
  canSync = false,
}: MeetingDetailActionsProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleStart() {
    startTransition(async () => {
      await startMeeting({ meetingId })
      router.refresh()
    })
  }

  function handleEnd() {
    startTransition(async () => {
      await endHubMeeting({ meetingId })
      router.refresh()
    })
  }

  /**
   * « Récupérer maintenant » — T-050.
   *
   * Google publie enregistrement et transcription plusieurs minutes après la
   * fin de l'appel. Le rattrapage automatique passe toutes les 15 minutes ;
   * ce bouton évite d'attendre, et sert aussi de relance manuelle après un
   * abandon (24 h).
   */
  function handleSync() {
    startTransition(async () => {
      const result = await syncMeetingResults({ meetingId })
      if (result.error) {
        showError(result.error.message)
        return
      }
      if (result.data?.archived) {
        showSuccess('Compte rendu déposé dans le dossier du client')
      } else if (result.data?.transcriptReady) {
        showSuccess('Transcription récupérée (déjà déposée)')
      } else if (result.data?.synced) {
        showSuccess("Enregistrement récupéré — la transcription n'est pas encore prête chez Google")
      } else {
        showError("Google n'a encore rien publié pour cette visio. Nouvel essai automatique dans 15 min.")
      }
      router.refresh()
    })
  }

  const isActive = status === 'scheduled' || status === 'in_progress'

  if (!isActive && !canSync) return null

  return (
    <div className="flex items-center gap-2">
      {status === 'scheduled' && (
        <button onClick={handleStart} disabled={isPending} className={BUTTON_CLASS}>
          Démarrer
        </button>
      )}
      {status === 'in_progress' && (
        <button
          onClick={handleEnd}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-md border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
        >
          Terminer
        </button>
      )}
      {canSync && (
        <button
          onClick={handleSync}
          disabled={isPending}
          title="Redemander à Google l'enregistrement et la transcription de cette visio"
          className={BUTTON_CLASS}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
          {isPending ? 'Récupération...' : 'Récupérer maintenant'}
        </button>
      )}
    </div>
  )
}
