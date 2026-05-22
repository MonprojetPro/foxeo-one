'use client'

import { cn } from '@monprojetpro/utils'
import type { ParcoursStepStatus } from '../types/parcours.types'

const statusConfig: Record<ParcoursStepStatus, { label: string; dot: string; className: string }> = {
  locked: {
    label: 'Verrouillée',
    dot: 'bg-[#6b7280]',
    className: 'bg-[#1f2937] text-[#9ca3af] border border-[#374151]',
  },
  current: {
    label: 'En cours',
    dot: 'bg-[#f59e0b] animate-pulse',
    className: 'bg-[#451a03] text-[#fbbf24] border border-[#92400e]',
  },
  completed: {
    label: 'Validée',
    dot: 'bg-[#22c55e]',
    className: 'bg-[#052e16] text-[#4ade80] border border-[#166534]',
  },
  skipped: {
    label: 'Passée',
    dot: 'bg-[#8b5cf6]',
    className: 'bg-[#2e1065] text-[#c4b5fd] border border-[#4c1d95]',
  },
  pending_review: {
    label: 'En attente',
    dot: 'bg-[#38bdf8] animate-pulse',
    className: 'bg-[#0c1a2e] text-[#7dd3fc] border border-[#0369a1]',
  },
  rejected: {
    label: 'À corriger',
    dot: 'bg-[#f87171]',
    className: 'bg-[#2d0a0a] text-[#fca5a5] border border-[#7f1d1d]',
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
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold',
        config.className,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dot)} aria-hidden="true" />
      {config.label}
    </span>
  )
}
