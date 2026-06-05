'use client'

import { cn } from '@monprojetpro/utils'
import type { TicketStatus } from '../types/support.types'

// Couleur forte par état (décision MiKL), repérable d'un coup d'œil côté Hub ET client.
const STATUS_CONFIG: Record<TicketStatus, { label: string; dot: string; badge: string }> = {
  open: {
    label: 'Ouvert',
    dot: 'bg-red-400',
    badge: 'bg-red-500/15 text-red-400 ring-1 ring-inset ring-red-500/30',
  },
  in_progress: {
    label: 'En cours',
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/30',
  },
  resolved: {
    label: 'Résolu',
    dot: 'bg-green-400',
    badge: 'bg-green-500/15 text-green-400 ring-1 ring-inset ring-green-500/30',
  },
  closed: {
    label: 'Fermé',
    dot: 'bg-muted-foreground',
    badge: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
  },
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.open
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.badge
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} aria-hidden="true" />
      {config.label}
    </span>
  )
}
