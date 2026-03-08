'use client'

import { Skeleton } from '@foxeo/ui'
import { useBillingSyncRows } from '../hooks/use-billing'
import type { BillingSyncRow } from '../types/billing.types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function computeSummary(rows: BillingSyncRow[]) {
  let totalPaid = 0
  let totalPending = 0
  let nextBillingDate: string | null = null

  for (const row of rows) {
    if (row.status === 'paid') {
      totalPaid += row.amount ?? 0
    } else if (row.status === 'unpaid' || row.status === 'pending') {
      totalPending += row.amount ?? 0
      // Prochain prélèvement = date d'échéance la plus proche
      const invoiceData = row.data as { deadline?: string }
      if (invoiceData.deadline) {
        if (!nextBillingDate || invoiceData.deadline < nextBillingDate) {
          nextBillingDate = invoiceData.deadline
        }
      }
    }
  }

  return { totalPaid, totalPending, nextBillingDate }
}

// ── Props ─────────────────────────────────────────────────────────────────────

type BillingSummaryProps = {
  clientId?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BillingSummary({ clientId }: BillingSummaryProps) {
  const { data: rows = [], isPending } = useBillingSyncRows('invoice', clientId)

  if (isPending) {
    return (
      <div className="grid grid-cols-3 gap-4" data-testid="billing-summary-skeleton">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    )
  }

  const { totalPaid, totalPending, nextBillingDate } = computeSummary(rows)

  return (
    <div className="grid grid-cols-3 gap-4">
      <SummaryCard
        label="Total payé"
        value={<span data-testid="total-paid">{formatCurrency(totalPaid)}</span>}
        className="text-green-500"
      />
      <SummaryCard
        label="En attente"
        value={<span data-testid="total-pending">{formatCurrency(totalPending)}</span>}
        className="text-orange-400"
      />
      <SummaryCard
        label="Prochain prélèvement"
        value={
          nextBillingDate
            ? new Date(nextBillingDate).toLocaleDateString('fr-FR')
            : '—'
        }
        className="text-muted-foreground"
      />
    </div>
  )
}

// ── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  className,
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className="rounded-lg border border-border p-4 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className={`text-lg font-semibold tabular-nums ${className ?? ''}`}>{value}</span>
    </div>
  )
}
