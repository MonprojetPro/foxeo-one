'use client'

import { cn } from '@monprojetpro/utils'
import type { ParcoursStepStatus } from '../types/parcours.types'

const statusConfig: Record<ParcoursStepStatus, { label: string; className: string }> = {
  locked: {
    label: 'Verrouillée',
    className: 'bg-muted text-muted-foreground',
  },
  current: {
    label: 'En cours',
    className: 'bg-purple-600/20 text-purple-400 border border-purple-500/30',
  },
  completed: {
    label: 'Complétée',
    className: 'bg-green-500/20 text-green-400 border border-green-500/30',
  },
  skipped: {
    label: 'Passée',
    className: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  },
}

interface ParcoursStepStatusBadgeProps {
  status: ParcoursStepStatus
  className?: string
}

export function ParcoursStepStatusBadge({ status, className }: ParcoursStepStatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
