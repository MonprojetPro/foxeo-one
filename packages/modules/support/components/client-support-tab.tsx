'use client'

import { Button, RowSkeleton, CockpitCallout, CockpitPanel } from '@monprojetpro/ui'
import { formatRelativeDate, cn } from '@monprojetpro/utils'
import { AlertCircle } from 'lucide-react'
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
  { value: 'open', label: 'Ouvert', activeClass: 'bg-red-500/80 text-white hover:bg-red-500/70 border-red-400/30' },
  { value: 'in_progress', label: 'En cours', activeClass: 'bg-amber-500/80 text-white hover:bg-amber-500/70 border-amber-400/30' },
  { value: 'resolved', label: 'Résolu', activeClass: 'bg-emerald-600/80 text-white hover:bg-emerald-600/70 border-emerald-400/30' },
  { value: 'closed', label: 'Fermé', activeClass: 'bg-white/10 text-gray-300 hover:bg-white/15 border-white/15' },
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
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <RowSkeleton key={i} className="h-20" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <CockpitCallout tone="red" icon={AlertCircle}>
        Impossible de charger les signalements.
      </CockpitCallout>
    )
  }

  if (!tickets || tickets.length === 0) {
    return (
      <CockpitCallout tone="gray">
        Aucun signalement de ce client.
      </CockpitCallout>
    )
  }

  return (
    <div className="space-y-2">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">
                  {TYPE_LABELS[ticket.type] ?? ticket.type}
                </span>
                <TicketStatusBadge status={ticket.status} />
              </div>
              <h3 className="text-sm font-medium text-gray-100">{ticket.subject}</h3>
              <ExpandableText text={ticket.description} />
              {ticket.screenshotUrl && (
                <a
                  href={ticket.screenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-cyan-300/80 underline hover:text-cyan-200"
                >
                  Voir la capture
                </a>
              )}
            </div>

            {/* Colonne droite : date + boutons de statut */}
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="text-xs text-gray-500">
                {formatRelativeDate(ticket.createdAt)}
              </span>
              <div className="flex max-w-[18rem] flex-wrap justify-end gap-1">
                {STATUS_OPTIONS.map((opt) => {
                  const active = ticket.status === opt.value
                  return (
                    <Button
                      key={opt.value}
                      size="sm"
                      variant="outline"
                      aria-pressed={active}
                      className={cn(
                        'h-6 px-2 text-[0.7rem] font-medium border',
                        active
                          ? opt.activeClass
                          : 'border-white/10 bg-transparent text-gray-500 hover:border-white/20 hover:text-gray-300',
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
        </div>
      ))}
    </div>
  )
}
