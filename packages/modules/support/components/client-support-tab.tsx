'use client'

import { Card, Skeleton, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@monprojetpro/ui'
import { formatRelativeDate } from '@monprojetpro/utils'
import { useSupportTickets, useUpdateTicketStatus } from '../hooks/use-support-tickets'
import { TicketStatusBadge } from './ticket-status-badge'
import { showSuccess, showError } from '@monprojetpro/ui'
import type { TicketType, TicketStatus } from '../types/support.types'

const TYPE_LABELS: Record<TicketType, string> = {
  bug: 'Bug',
  question: 'Question',
  suggestion: 'Suggestion',
}

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'open', label: 'Ouvert' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'resolved', label: 'Résolu' },
  { value: 'closed', label: 'Fermé' },
]

export function ClientSupportTab({ clientId }: { clientId: string }) {
  const { data: tickets, isPending, error } = useSupportTickets({ clientId })
  const updateStatus = useUpdateTicketStatus()

  const handleStatusChange = (ticketId: string, status: TicketStatus) => {
    updateStatus.mutate(
      { ticketId, status },
      {
        onSuccess: () => {
          showSuccess(`Statut mis à jour : ${STATUS_OPTIONS.find((s) => s.value === status)?.label}`)
        },
        onError: (err) => {
          showError(err.message)
        },
      }
    )
  }

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
    return <p className="text-sm text-destructive">Impossible de charger les signalements.</p>
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">Aucun signalement de ce client.</p>
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
              <p className="text-sm text-muted-foreground">{ticket.description}</p>
              {ticket.screenshotUrl && (
                <a
                  href={ticket.screenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline"
                >
                  Voir la capture
                </a>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="text-xs text-muted-foreground">
                {formatRelativeDate(ticket.createdAt)}
              </span>
              <Select
                value={ticket.status}
                onValueChange={(value) => handleStatusChange(ticket.id, value as TicketStatus)}
                disabled={updateStatus.isPending}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
