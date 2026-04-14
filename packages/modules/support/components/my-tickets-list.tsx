'use client'

import { Card, Skeleton } from '@monprojetpro/ui'
import { formatRelativeDate } from '@monprojetpro/utils'
import { useSupportTickets } from '../hooks/use-support-tickets'
import { TicketStatusBadge } from './ticket-status-badge'
import type { TicketType } from '../types/support.types'

const TYPE_LABELS: Record<TicketType, string> = {
  bug: 'Bug',
  question: 'Question',
  suggestion: 'Suggestion',
}

export function MyTicketsList() {
  const { data: tickets, isPending, error } = useSupportTickets()

  if (isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Impossible de charger vos signalements.
      </p>
    )
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">Aucun signalement pour le moment.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <Card key={ticket.id} className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {TYPE_LABELS[ticket.type] ?? ticket.type}
                </span>
                <TicketStatusBadge status={ticket.status} />
              </div>
              <h3 className="font-medium">{ticket.subject}</h3>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {ticket.description}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatRelativeDate(ticket.createdAt)}
            </span>
          </div>
        </Card>
      ))}
    </div>
  )
}
