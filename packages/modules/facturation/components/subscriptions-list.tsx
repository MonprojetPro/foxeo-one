'use client'

import { Skeleton } from '@foxeo/ui'
import { useBillingSyncRows } from '../hooks/use-billing'
import type { BillingSyncRow } from '../types/billing.types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  stopped: 'Suspendu',
  finished: 'Terminé',
}

const STATUS_CLASSES: Record<string, string> = {
  active: 'bg-green-500/10 text-green-500 border border-green-500/30',
  stopped: 'bg-orange-500/10 text-orange-400 border border-orange-500/30',
  finished: 'bg-muted text-muted-foreground border border-border',
}

function formatAmount(cents: number | null): string {
  if (cents === null) return '—'
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

function getPeriodLabel(period: string | undefined): string {
  switch (period) {
    case 'monthly': return 'Mensuel'
    case 'quarterly': return 'Trimestriel'
    case 'yearly': return 'Annuel'
    default: return period ?? '—'
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

type SubscriptionsListProps = {
  clientId?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SubscriptionsList({ clientId }: SubscriptionsListProps) {
  const { data: rows, isPending, isError } = useBillingSyncRows('subscription', clientId)

  if (isPending) {
    return (
      <div data-testid="subscriptions-skeleton" className="flex flex-col gap-3">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">
        Erreur lors du chargement des abonnements
      </div>
    )
  }

  const allRows = rows ?? []

  if (allRows.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
        Aucun abonnement trouvé
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2" data-testid="subscriptions-list">
      {allRows.map((row) => (
        <SubscriptionRow key={row.id} row={row} />
      ))}
    </div>
  )
}

// ── Row sub-component ─────────────────────────────────────────────────────────

function SubscriptionRow({ row }: { row: BillingSyncRow }) {
  const subData = row.data as {
    start_date?: string
    recurring_period?: string
    status?: string
  }

  const displayStatus = row.status
  const statusClass = STATUS_CLASSES[displayStatus] ?? STATUS_CLASSES.finished
  const statusLabel = STATUS_LABELS[displayStatus] ?? displayStatus

  return (
    <div
      data-testid="subscription-row"
      className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-accent/30 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-sm font-medium" data-testid="subscription-id">
            {row.pennylane_id}
          </span>
          <span className="text-xs text-muted-foreground">
            Début: {formatDate(subData.start_date)}
            {subData.recurring_period ? ` · ${getPeriodLabel(subData.recurring_period)}` : ''}
          </span>
        </div>

        <span
          data-testid="subscription-status"
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold tabular-nums">
          {formatAmount(row.amount)}
        </span>
      </div>
    </div>
  )
}
