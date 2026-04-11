'use client'

import { Skeleton } from '@monprojetpro/ui'
import { useBillingSyncRows } from '../hooks/use-billing'
import type { BillingSyncRow } from '../types/billing.types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  stopped: 'Suspendu',
  finished: 'Résilié',
}

const STATUS_CLASSES: Record<string, string> = {
  active: 'bg-green-500/10 text-green-500 border border-green-500/30',
  stopped: 'bg-orange-500/10 text-orange-400 border border-orange-500/30',
  finished: 'bg-destructive/10 text-destructive border border-destructive/30',
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
    default: return '—'
  }
}

function getMonthlyAmount(row: BillingSyncRow): number {
  const cents = row.amount ?? 0
  const period = (row.data as { recurring_period?: string }).recurring_period
  if (period === 'quarterly') return Math.round(cents / 3)
  if (period === 'yearly') return Math.round(cents / 12)
  return cents
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SubscriptionCardContent({ row }: { row: BillingSyncRow }) {
  const subData = row.data as {
    start_date?: string
    recurring_period?: string
    next_billing_date?: string
    deadline?: string
  }

  const statusClass = STATUS_CLASSES[row.status] ?? STATUS_CLASSES.finished
  const statusLabel = STATUS_LABELS[row.status] ?? row.status
  const monthlyAmount = getMonthlyAmount(row)
  const nextBillingDate = subData.next_billing_date ?? subData.deadline

  return (
    <div
      data-testid="subscription-card"
      className="rounded-lg border border-border p-5 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {row.status === 'active' ? 'Mon abonnement actif' : 'Mon abonnement'}
        </h3>
        <span
          data-testid="subscription-status-badge"
          className={`rounded-full px-3 py-0.5 text-xs font-medium ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Période</span>
          <span className="text-sm font-medium" data-testid="subscription-period">
            {getPeriodLabel(subData.recurring_period)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Montant mensuel</span>
          <span className="text-sm font-semibold tabular-nums" data-testid="subscription-monthly-amount">
            {formatAmount(monthlyAmount)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Prochain prélèvement</span>
          <span className="text-sm font-medium" data-testid="subscription-next-date">
            {formatDate(nextBillingDate)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

type SubscriptionCardProps = {
  clientId: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SubscriptionCard({ clientId }: SubscriptionCardProps) {
  const { data: rows = [], isPending, isError } = useBillingSyncRows('subscription', clientId)

  if (isPending) {
    return <Skeleton className="h-28 w-full rounded-lg" data-testid="subscription-card-skeleton" />
  }

  if (isError) return null

  const activeSubscription = rows.find((r) => r.status === 'active') ?? rows[0]

  if (!activeSubscription) {
    return null
  }

  return <SubscriptionCardContent row={activeSubscription} />
}
