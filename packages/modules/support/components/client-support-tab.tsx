'use client'

import { Card, Skeleton, Button } from '@monprojetpro/ui'
import { formatRelativeDate, cn } from '@monprojetpro/utils'
import { useSupportTickets, useUpdateTicketStatus } from '../hooks/use-support-tickets'
import { TicketStatusBadge } from './ticket-status-badge'
import { ExpandableText } from './expandable-text'
import { showSuccess, showError } from '@monprojetpro/ui'
import type { TicketType, TicketStatus } from '../types/support.types'

const TYPE_LABELS: Record<TicketType, string> = {
  bug: 'Bug',
  question: 'Question',
  suggestion: 'Suggestion',
}

const STATUS_OPTIONS: { value: TicketStatus; label: string; activeClass: string }[] = [
  { value: 'open', label: 'Ouvert', activeClass: 'bg-red-500 text-white hover:bg-red-500/90' },
  { value: 'in_progress', label: 'En cours', activeClass: 'bg-amber-500 text-white hover:bg-amber-500/90' },
  { value: 'resolved', label: 'Résolu', activeClass: 'bg-green-600 text-white hover:bg-green-600/90' },
  { value: 'closed', label: 'Fermé', activeClass: 'bg-zinc-600 text-white hover:bg-zinc-600/90' },
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
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {TYPE_LABELS[ticket.type] ?? ticket.type}
                </span>
                <TicketStatusBadge status={ticket.status} />
              </div>
              <h3 className="font-medium">{ticket.subject}</h3>
              <ExpandableText text={ticket.description} />
              {ticket.screenshotUrl && (
                <a
                  href={ticket.screenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-primary underline"
                >
                  Voir la capture
                </a>
              )}
            </div>

            {/* Colonne droite : date + boutons de statut (alignés avec le reste) */}
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="text-xs text-muted-foreground">
                {formatRelativeDate(ticket.createdAt)}
              </span>
              <div className="flex max-w-[18rem] flex-wrap justify-end gap-1.5">
                {STATUS_OPTIONS.map((opt) => {
                  const active = ticket.status === opt.value
                  return (
                    <Button
                      key={opt.value}
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      aria-pressed={active}
                      className={cn(
                        'h-7 px-2.5 text-xs',
                        active && opt.activeClass,
                        active && 'cursor-default'
                      )}
                      disabled={updateStatus.isPending}
                      onClick={() => {
                        if (!active) handleStatusChange(ticket.id, opt.value)
                      }}
                    >
                      {opt.label}
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
