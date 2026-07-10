'use client'

import { Badge } from '@monprojetpro/ui'
import type { ParcoursStatus } from '../types/crm.types'

interface ParcoursStatusBadgeProps {
  status: ParcoursStatus
}

// Classes cockpit par état de parcours (teintes sémantiques sur fond sombre)
const statusConfig: Record<ParcoursStatus, { label: string; className: string }> = {
  en_cours: {
    label: 'En cours',
    className: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-300',
  },
  suspendu: {
    label: 'Suspendu',
    className: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  },
  termine: {
    label: 'Terminé',
    className: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  },
  abandoned: {
    label: 'Abandonné',
    className: 'border-white/10 bg-white/5 text-gray-400',
  },
}

export function ParcoursStatusBadge({ status }: ParcoursStatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: 'border-white/10 bg-white/5 text-gray-400',
  }

  return (
    <Badge
      variant="outline"
      className={config.className}
      data-testid="parcours-status-badge"
    >
      {config.label}
    </Badge>
  )
}
