'use client'

import { useTransition } from 'react'
import { showError } from '@monprojetpro/ui'
import type { MeetingRecording } from '../types/recording.types'
import { RecordingStatusBadge } from './recording-status-badge'
import { downloadTranscript } from '../actions/download-transcript'
import { downloadRecording } from '../actions/download-recording'

/**
 * 🔑 POURQUOI DES BOUTONS ET PLUS DES LIENS BRUTS (T-050).
 *
 * Le tableau pointait directement sur `rec.transcriptUrl`, l'URL Google. Deux
 * conséquences : le PDF déposé dans le dossier du client n'était JAMAIS servi,
 * et les deux Server Actions prévues pour ça (`downloadTranscript`,
 * `downloadRecording`) n'étaient appelées par personne — on a longtemps cru
 * qu'elles « ne marchaient pas », alors qu'elles n'étaient simplement jamais
 * exécutées.
 *
 * La règle « archive d'abord, Google ensuite » vit dans l'action, à un seul
 * endroit. La recopier dans le JSX serait la condamner à diverger.
 */

interface RecordingListProps {
  recordings: MeetingRecording[]
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}min`
  if (m > 0) return `${m}min ${s}s`
  return `${s}s`
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function ExternalLinkIcon() {
  return (
    <svg
      className="ml-1 inline-block h-3 w-3"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  )
}

const LINK_CLASS =
  'inline-flex items-center rounded-md border border-white/20 px-3 py-1 text-xs font-medium hover:bg-white/10 disabled:opacity-50'

function OpenResourceButton({
  label,
  busyLabel,
  onResolve,
}: {
  label: string
  busyLabel: string
  onResolve: () => Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>
}) {
  const [isPending, start] = useTransition()

  function handleClick() {
    start(async () => {
      const result = await onResolve()
      if (result.error || !result.data?.signedUrl) {
        showError(result.error?.message ?? 'Lien indisponible')
        return
      }
      window.open(result.data.signedUrl, '_blank', 'noopener,noreferrer')
    })
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={LINK_CLASS}>
      {isPending ? busyLabel : label}
      {!isPending && <ExternalLinkIcon />}
    </button>
  )
}

export function RecordingList({ recordings }: RecordingListProps) {
  if (recordings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">Aucun enregistrement disponible</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="pb-3 pr-4 font-medium text-muted-foreground">Date</th>
              <th className="pb-3 pr-4 font-medium text-muted-foreground">Durée</th>
              <th className="pb-3 pr-4 font-medium text-muted-foreground">Transcription</th>
              <th className="pb-3 font-medium text-muted-foreground">Liens</th>
            </tr>
          </thead>
          <tbody>
            {recordings.map((rec) => (
              <tr key={rec.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-3 pr-4 text-muted-foreground">{formatDate(rec.createdAt)}</td>
                <td className="py-3 pr-4">
                  {rec.recordingDurationSeconds > 0
                    ? formatDuration(rec.recordingDurationSeconds)
                    : '—'}
                </td>
                <td className="py-3 pr-4">
                  <RecordingStatusBadge status={rec.transcriptionStatus} />
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    {rec.recordingUrl ? (
                      <OpenResourceButton
                        label="Enregistrement (Google Drive)"
                        busyLabel="Ouverture..."
                        onResolve={() => downloadRecording({ recordingId: rec.id })}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        En cours de traitement...
                      </span>
                    )}
                    {rec.transcriptionStatus === 'completed' && (
                      <OpenResourceButton
                        label="Transcription"
                        busyLabel="Ouverture..."
                        onResolve={() => downloadTranscript({ recordingId: rec.id })}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
