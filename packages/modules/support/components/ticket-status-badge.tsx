'use client'

import { Badge } from '@monprojetpro/ui'
import type { TicketStatus } from '../types/support.types'

const STATUS_CONFIG: Record<TicketStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  open: { label: 'Ouvert', variant: 'destructive' },
  in_progress: { label: 'En cours', variant: 'default' },
  resolved: { label: 'Résolu', variant: 'secondary' },
  closed: { label: 'Fermé', variant: 'outline' },
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.open
  return <Badge variant={config.variant}>{config.label}</Badge>
}
