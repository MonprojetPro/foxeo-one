import type { TranscriptionStatus } from '../types/recording.types'

const STATUS_CONFIG: Record<TranscriptionStatus, { label: string; className: string }> = {
  pending: { label: 'En attente de traitement Google', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  processing: { label: 'Gemini transcrit en cours...', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  completed: { label: 'Disponible', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  failed: { label: 'Non disponible', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

interface RecordingStatusBadgeProps {
  status: TranscriptionStatus
}

export function RecordingStatusBadge({ status }: RecordingStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  )
}
