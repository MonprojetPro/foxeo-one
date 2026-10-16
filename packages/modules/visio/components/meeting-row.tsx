'use client'

import { useState, useTransition } from 'react'
import { Button, showError, showSuccess } from '@monprojetpro/ui'
import {
  CalendarClock,
  Check,
  Copy,
  ExternalLink,
  FileText,
  RefreshCw,
  Send,
  Video,
  XCircle,
} from 'lucide-react'
import type { ActionResponse } from '@monprojetpro/types'
import { MeetingStatusBadge } from './meeting-status-badge'
import type { Meeting } from '../types/meeting.types'
import {
  canSyncMeetingResults,
  describeTranscriptSyncState,
  readTranscriptSyncState,
} from '../utils/transcript-sync-state'

/**
 * Une visio et TOUT ce qu'on peut en faire — T-056.
 *
 * Demande de MiKL : *« à part rejoindre on peut rien faire d'autre »*.
 *
 * 🔑 LA TRACE D'ENVOI EST AFFICHÉE, PAS SEULEMENT ENREGISTRÉE. Renvoyer un lien
 * sans savoir à qui ni quand il est déjà parti, c'est renvoyer à l'aveugle et
 * doublonner sans le voir. C'est l'erreur exacte commise sur les factures
 * (T-044a) : la colonne était écrite, l'écran ne la lisait pas, et la garde
 * anti-double-envoi ne gardait donc rien.
 *
 * 🔑 « DÉPLACER » NE RECRÉE PAS LA SALLE. Le lien a peut-être déjà été envoyé
 * au client : en générer un nouveau le rendrait caduc en silence, et le client
 * arriverait dans une salle vide à l'heure dite.
 */

export interface VisioRecipient {
  email: string
  label: string
}

export type ResendMeetLinkFn = (input: {
  meetingId: string
  recipientEmail: string
}) => Promise<ActionResponse<{ recipientEmail: string; sentCount: number }>>

export type MeetingActionFn = (input: { meetingId: string }) => Promise<ActionResponse<unknown>>

export type RescheduleMeetingFn = (input: {
  meetingId: string
  scheduledAt: string
}) => Promise<ActionResponse<unknown>>

/**
 * Récupération manuelle des résultats de la visio (T-050). Le retour dit ce
 * qui s'est réellement passé — « rien reçu de Google » et « compte rendu
 * déposé » ne doivent jamais produire le même message.
 */
export type SyncMeetingResultsFn = (input: { meetingId: string }) => Promise<
  ActionResponse<{ synced: boolean; transcriptReady: boolean; archived: boolean }>
>

export interface MeetingRowProps {
  meeting: Meeting
  recipients?: VisioRecipient[]
  onResend?: ResendMeetLinkFn
  onCancel?: MeetingActionFn
  onReschedule?: RescheduleMeetingFn
  /** « Récupérer maintenant » — relance la recherche du compte rendu chez Google. */
  onSyncResults?: SyncMeetingResultsFn
  onChanged?: () => void
}

export function formatMeetingDateTime(iso: string | null): string {
  if (!iso) return 'Date non précisée'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(
    new Date(iso)
  )
}

export function formatMeetingDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `${hours} h ${String(minutes % 60).padStart(2, '0')}`
}

const ACTION_CLASS =
  'inline-flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1.5 text-xs hover:bg-white/10 disabled:opacity-50'

export function MeetingRow({
  meeting,
  recipients = [],
  onResend,
  onCancel,
  onReschedule,
  onSyncResults,
  onChanged,
}: MeetingRowProps) {
  const duration = formatMeetingDuration(meeting.durationSeconds)
  const syncState = readTranscriptSyncState(meeting.metadata)
  const syncSentence = describeTranscriptSyncState(syncState)
  const [isBusy, startAction] = useTransition()
  const [resendOpen, setResendOpen] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [chosenResendTo, setChosenResendTo] = useState<string | null>(null)
  const [newDate, setNewDate] = useState('')
  const [copied, setCopied] = useState(false)

  const actionable = meeting.status === 'scheduled' || meeting.status === 'in_progress'

  // Destinataire dérivé, jamais figé : par défaut celui du dernier envoi — on
  // renvoie normalement à la même personne.
  const resendTarget =
    chosenResendTo && recipients.some((r) => r.email === chosenResendTo)
      ? chosenResendTo
      : recipients.find((r) => r.email === meeting.inviteLastSentTo)?.email ??
        recipients[0]?.email ??
        ''

  async function handleCopy() {
    if (!meeting.meetUri) return
    try {
      await navigator.clipboard.writeText(meeting.meetUri)
      setCopied(true)
      showSuccess('Lien copié — à coller dans un SMS ou dans le Chat')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Le presse-papier est refusé hors contexte sécurisé. On le DIT, au lieu
      // de laisser croire que la copie a eu lieu.
      showError("Le navigateur a refusé l'accès au presse-papier. Sélectionne le lien à la main.")
    }
  }

  function handleResend() {
    if (!onResend || !resendTarget) return
    startAction(async () => {
      const r = await onResend({ meetingId: meeting.id, recipientEmail: resendTarget })
      if (r.error) {
        showError(r.error.message)
        return
      }
      showSuccess(`Lien renvoyé à ${r.data?.recipientEmail ?? resendTarget}`)
      setResendOpen(false)
      onChanged?.()
    })
  }

  function handleCancel() {
    if (!onCancel) return
    startAction(async () => {
      const r = await onCancel({ meetingId: meeting.id })
      if (r.error) {
        showError(r.error.message)
        return
      }
      showSuccess('Rendez-vous annulé')
      onChanged?.()
    })
  }

  function handleSync() {
    if (!onSyncResults) return
    startAction(async () => {
      const r = await onSyncResults({ meetingId: meeting.id })
      if (r.error) {
        showError(r.error.message)
        return
      }
      // Trois issues distinctes, trois messages distincts : dire « c'est fait »
      // quand Google n'a encore rien produit, c'est renvoyer MiKL chercher un
      // document qui n'existe pas.
      if (r.data?.archived) {
        showSuccess('Compte rendu déposé dans le dossier du client')
      } else if (r.data?.transcriptReady) {
        showSuccess('Transcription récupérée (déjà déposée)')
      } else if (r.data?.synced) {
        showSuccess("Enregistrement récupéré — la transcription n'est pas encore prête chez Google")
      } else {
        showError("Google n'a encore rien publié pour cette visio. Nouvel essai automatique dans 15 min.")
      }
      onChanged?.()
    })
  }

  function handleReschedule() {
    if (!onReschedule || !newDate) return
    startAction(async () => {
      const r = await onReschedule({
        meetingId: meeting.id,
        scheduledAt: new Date(newDate).toISOString(),
      })
      if (r.error) {
        showError(r.error.message)
        return
      }
      showSuccess('Rendez-vous déplacé — pense à renvoyer le lien pour prévenir le client')
      setRescheduleOpen(false)
      setNewDate('')
      onChanged?.()
    })
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-sm font-medium text-foreground">{meeting.title}</p>
          <p className="text-xs text-muted-foreground">
            {formatMeetingDateTime(meeting.endedAt ?? meeting.scheduledAt)}
            {duration ? ` · ${duration}` : ''}
          </p>
          <p className="text-xs text-muted-foreground/80">
            {meeting.inviteLastSentAt ? (
              <>
                Envoyé à <span className="text-foreground/70">{meeting.inviteLastSentTo}</span> le{' '}
                {formatMeetingDateTime(meeting.inviteLastSentAt)}
                {meeting.inviteSentCount > 1 ? ` · ${meeting.inviteSentCount} envois` : ''}
              </>
            ) : (
              <span className="italic">Lien jamais envoyé par email</span>
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <MeetingStatusBadge status={meeting.status} />

          {meeting.meetUri && (
            <>
              <a
                href={meeting.meetUri}
                target="_blank"
                rel="noopener noreferrer"
                className={ACTION_CLASS}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Rejoindre
              </a>
              <button
                type="button"
                onClick={handleCopy}
                title="Copier le lien — pour l'envoyer par SMS ou par le Chat"
                className={ACTION_CLASS}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copié' : 'Copier'}
              </button>
            </>
          )}

          {actionable && onResend && meeting.meetUri && (
            <button type="button" onClick={() => setResendOpen((v) => !v)} className={ACTION_CLASS}>
              <Send className="h-3.5 w-3.5" />
              Renvoyer
            </button>
          )}

          {actionable && onReschedule && (
            <button
              type="button"
              onClick={() => setRescheduleOpen((v) => !v)}
              className={ACTION_CLASS}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              Déplacer
            </button>
          )}

          {actionable && onCancel && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isBusy}
              className="inline-flex items-center gap-1 rounded-md border border-red-400/25 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              Annuler
            </button>
          )}

          {meeting.recordingUrl && (
            <a
              href={meeting.recordingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Video className="h-3.5 w-3.5" />
              Enregistrement
            </a>
          )}

          {meeting.transcriptUrl && (
            <a
              href={meeting.transcriptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <FileText className="h-3.5 w-3.5" />
              Transcription
            </a>
          )}

          {/* La récupération reste offerte même quand tout est déjà là : Google
              peut publier une transcription après coup, et MiKL ne doit jamais
              être obligé d'attendre le prochain passage du rattrapage. */}
          {onSyncResults && canSyncMeetingResults(meeting, Date.now()) && (
            <button
              type="button"
              onClick={handleSync}
              disabled={isBusy}
              title="Redemander à Google l'enregistrement et la transcription de cette visio"
              className={ACTION_CLASS}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isBusy ? 'animate-spin' : ''}`} />
              {isBusy ? 'Récupération...' : 'Récupérer maintenant'}
            </button>
          )}
        </div>
      </div>

      {syncSentence && (
        <p className="mt-2 text-xs text-muted-foreground/80">{syncSentence}</p>
      )}

      {resendOpen && (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-white/10 pt-3">
          <div className="flex min-w-[240px] flex-1 flex-col gap-1.5">
            <label
              htmlFor={`resend-${meeting.id}`}
              className="text-xs font-medium text-muted-foreground"
            >
              Renvoyer le lien à
            </label>
            <select
              id={`resend-${meeting.id}`}
              value={resendTarget}
              onChange={(e) => setChosenResendTo(e.target.value)}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
            >
              {recipients.map((r) => (
                <option key={r.email} value={r.email}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            onClick={handleResend}
            disabled={isBusy || !resendTarget}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {isBusy ? 'Envoi...' : 'Renvoyer'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setResendOpen(false)}>
            Fermer
          </Button>
        </div>
      )}

      {rescheduleOpen && (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-white/10 pt-3">
          <div className="flex min-w-[240px] flex-1 flex-col gap-1.5">
            <label
              htmlFor={`reschedule-${meeting.id}`}
              className="text-xs font-medium text-muted-foreground"
            >
              Nouvelle date — le lien de visio reste le même
            </label>
            <input
              id={`reschedule-${meeting.id}`}
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>
          <Button
            size="sm"
            onClick={handleReschedule}
            disabled={isBusy || !newDate}
            className="gap-1.5"
          >
            <CalendarClock className="h-3.5 w-3.5" />
            {isBusy ? 'Déplacement...' : 'Déplacer'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setRescheduleOpen(false)}>
            Fermer
          </Button>
        </div>
      )}
    </div>
  )
}
