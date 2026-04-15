'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Skeleton, showSuccess, showError } from '@monprojetpro/ui'
import { useBillingSyncRows } from '../hooks/use-billing'
import { convertQuoteToInvoice } from '../actions/convert-quote-to-invoice'
import { sendQuoteByEmail } from '../actions/send-quote-by-email'
import { cancelQuote } from '../actions/cancel-quote'
import type { BillingSyncRow, ClientWithPennylane } from '../types/billing.types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  accepted: 'Accepté',
  denied: 'Refusé',
}

const STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-blue-500/10 text-blue-500',
  accepted: 'bg-green-500/10 text-green-500',
  denied: 'bg-destructive/10 text-destructive',
}

function formatAmount(cents: number | null): string {
  if (cents === null) return '—'
  return (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

// ── Props ─────────────────────────────────────────────────────────────────────

type QuotesListProps = {
  clientId?: string
  clients?: ClientWithPennylane[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function QuotesList({ clientId, clients }: QuotesListProps) {
  const queryClient = useQueryClient()
  const { data: rows, isPending, isError } = useBillingSyncRows('quote', clientId)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [periodFilter, setPeriodFilter] = useState<string>('all')
  const [converting, setConverting] = useState<string | null>(null)
  const [sending, setSending] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)

  if (isPending) {
    return (
      <div data-testid="quotes-skeleton" className="flex flex-col gap-3">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">
        Erreur lors du chargement des devis
      </div>
    )
  }

  const allRows = rows ?? []

  // Apply filters
  const filtered = allRows.filter((row) => {
    if (statusFilter !== 'all' && row.status !== statusFilter) return false
    if (clientFilter !== 'all' && row.client_id !== clientFilter) return false
    if (periodFilter !== 'all') {
      const quoteData = row.data as { date?: string }
      const quoteDate = quoteData.date ? new Date(quoteData.date) : null
      if (!quoteDate) return false
      const now = new Date()
      if (periodFilter === '7d') {
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(now.getDate() - 7)
        if (quoteDate < sevenDaysAgo) return false
      } else if (periodFilter === '30d') {
        const thirtyDaysAgo = new Date(now)
        thirtyDaysAgo.setDate(now.getDate() - 30)
        if (quoteDate < thirtyDaysAgo) return false
      } else if (periodFilter === '90d') {
        const ninetyDaysAgo = new Date(now)
        ninetyDaysAgo.setDate(now.getDate() - 90)
        if (quoteDate < ninetyDaysAgo) return false
      }
    }
    return true
  })

  if (allRows.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
        Aucun devis trouvé
      </div>
    )
  }

  async function handleConvert(row: BillingSyncRow) {
    if (!row.client_id) return
    setConverting(row.pennylane_id)
    try {
      const result = await convertQuoteToInvoice(row.pennylane_id, row.client_id)
      if (result.error) {
        showError(result.error.message)
      } else {
        showSuccess('Devis converti en facture')
      }
    } finally {
      setConverting(null)
    }
  }

  async function handleRelancer(row: BillingSyncRow) {
    setSending(row.pennylane_id)
    try {
      const result = await sendQuoteByEmail(row.pennylane_id)
      if (result.error) {
        showError(result.error.message)
        return
      }
      const number = (row.data as { quote_number?: string }).quote_number ?? row.pennylane_id
      showSuccess(`Email envoyé pour le devis ${number}`)
    } finally {
      setSending(null)
    }
  }

  async function handleAnnuler(row: BillingSyncRow) {
    if (!confirm('Annuler ce devis ? Le statut sera passé à "denied" côté Pennylane.')) {
      return
    }
    setCancelling(row.pennylane_id)
    try {
      const result = await cancelQuote(row.pennylane_id)
      if (result.error) {
        showError(result.error.message)
        return
      }
      const number = (row.data as { quote_number?: string }).quote_number ?? row.pennylane_id
      showSuccess(`Devis ${number} annulé`)
      // Rafraichir la liste pour afficher le nouveau statut
      await queryClient.invalidateQueries({ queryKey: ['billing'] })
    } finally {
      setCancelling(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <QuoteFilters
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        clientFilter={clientFilter}
        onClientChange={setClientFilter}
        periodFilter={periodFilter}
        onPeriodChange={setPeriodFilter}
        clients={clients}
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          Aucun devis pour ces filtres
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((row) => {
            const quoteData = row.data as { quote_number?: string; date?: string; deadline?: string }
            return (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{quoteData.quote_number ?? row.pennylane_id}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(quoteData.date)}</span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[row.status] ?? STATUS_CLASSES.draft}`}
                  >
                    {STATUS_LABELS[row.status] ?? row.status}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold tabular-nums">
                    {formatAmount(row.amount)}
                  </span>

                  <div className="flex items-center gap-2">
                    {(row.status === 'draft' || row.status === 'pending') && (
                      <button
                        type="button"
                        disabled={sending === row.pennylane_id}
                        onClick={() => handleRelancer(row)}
                        className="rounded-md bg-blue-500/10 px-2.5 py-1 text-xs text-blue-500 hover:bg-blue-500/20 disabled:opacity-50"
                      >
                        {sending === row.pennylane_id ? 'Envoi...' : 'Envoyer par email'}
                      </button>
                    )}
                    {row.status === 'accepted' && row.client_id && (
                      <button
                        type="button"
                        disabled={converting === row.pennylane_id}
                        onClick={() => handleConvert(row)}
                        className="rounded-md bg-primary/10 px-2.5 py-1 text-xs text-primary hover:bg-primary/20 disabled:opacity-50"
                      >
                        {converting === row.pennylane_id ? '...' : 'Convertir en facture'}
                      </button>
                    )}
                    {(row.status === 'draft' || row.status === 'pending') && (
                      <button
                        type="button"
                        disabled={cancelling === row.pennylane_id}
                        onClick={() => handleAnnuler(row)}
                        className="rounded-md bg-destructive/10 px-2.5 py-1 text-xs text-destructive hover:bg-destructive/20 disabled:opacity-50"
                      >
                        {cancelling === row.pennylane_id ? 'Annulation...' : 'Annuler'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Filters sub-component ─────────────────────────────────────────────────────

function QuoteFilters({
  statusFilter,
  onStatusChange,
  clientFilter,
  onClientChange,
  periodFilter,
  onPeriodChange,
  clients,
}: {
  statusFilter: string
  onStatusChange: (v: string) => void
  clientFilter: string
  onClientChange: (v: string) => void
  periodFilter: string
  onPeriodChange: (v: string) => void
  clients?: ClientWithPennylane[]
}) {
  const statuses = [
    { value: 'all', label: 'Tous' },
    { value: 'draft', label: 'Brouillons' },
    { value: 'pending', label: 'En attente' },
    { value: 'accepted', label: 'Acceptés' },
    { value: 'denied', label: 'Refusés' },
  ]

  const periods = [
    { value: 'all', label: 'Toutes périodes' },
    { value: '7d', label: '7 derniers jours' },
    { value: '30d', label: '30 derniers jours' },
    { value: '90d', label: '90 derniers jours' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Status filter */}
      <div className="flex items-center gap-1.5">
        {statuses.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onStatusChange(s.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === s.value
                ? 'bg-primary text-primary-foreground'
                : 'border border-border text-muted-foreground hover:bg-accent'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Client filter */}
      {clients && clients.length > 0 && (
        <select
          value={clientFilter}
          onChange={(e) => onClientChange(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs"
          aria-label="Filtrer par client"
        >
          <option value="all">Tous les clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}

      {/* Period filter */}
      <select
        value={periodFilter}
        onChange={(e) => onPeriodChange(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-xs"
        aria-label="Filtrer par période"
      >
        {periods.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
    </div>
  )
}
