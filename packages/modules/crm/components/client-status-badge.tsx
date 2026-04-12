'use client'

import { Badge } from '@monprojetpro/ui'
import type { ClientStatus } from '../types/crm.types'

interface ClientStatusBadgeProps {
  status: ClientStatus
  suspendedAt?: string | null
  archivedAt?: string | null
  className?: string
}

const statusConfig: Record<
  ClientStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    className?: string
  }
> = {
  active: {
    label: 'Actif',
    variant: 'default',
    className: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/40 font-medium',
  },
  suspended: {
    label: 'Suspendu',
    variant: 'secondary',
    className: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 font-medium',
  },
  archived: {
    label: 'Archivé',
    variant: 'outline',
    className: 'bg-slate-500/20 text-slate-500 dark:text-slate-400 border-slate-500/40',
  },
  deleted: {
    label: 'Supprimé',
    variant: 'destructive',
    className: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40',
  },
  prospect: {
    label: 'Prospect',
    variant: 'outline',
    className: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/40 font-medium',
  },
}

const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function ClientStatusBadge({
  status,
  suspendedAt,
  archivedAt,
  className,
}: ClientStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.active

  const dateLabel =
    status === 'suspended' && suspendedAt
      ? ` depuis le ${formatDate(suspendedAt)}`
      : status === 'archived' && archivedAt
        ? ` le ${formatDate(archivedAt)}`
        : ''

  return (
    <Badge
      variant={config.variant}
      className={`${config.className} ${className || ''}`}
      title={dateLabel ? `${config.label}${dateLabel}` : undefined}
    >
      {config.label}
      {dateLabel && (
        <span className="ml-1 text-xs opacity-75">{dateLabel}</span>
      )}
    </Badge>
  )
}
