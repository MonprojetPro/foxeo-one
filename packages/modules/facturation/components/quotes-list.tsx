'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Skeleton,
  showSuccess,
  showError,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@monprojetpro/ui'
import { useBillingSyncRows } from '../hooks/use-billing'
import { convertQuoteToInvoice } from '../actions/convert-quote-to-invoice'
import { sendQuoteByEmail } from '../actions/send-quote-by-email'
import { cancelQuote } from '../actions/cancel-quote'
import { QuoteForm, type QuoteFormInitialValues } from './quote-form'
import type {
  BillingSyncRow,
  ClientWithPennylane,
  LineItem,
  QuoteType,
} from '../types/billing.types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  accepted: 'Accepté',
  denied: 'Refusé',
  cancelled: 'Annulé',
}

const STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-blue-500/10 text-blue-500',
  accepted: 'bg-green-500/10 text-green-500',
  denied: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-orange-500/10 text-orange-500',
}

// Story 13.4 patch — distinction visuelle entre "denied" (refus client)
// et "cancelled" (annulation MiKL). Pennylane n a qu un seul statut natif
// (denied), mais billing_sync.data.cancelled_by_operator nous permet de
// faire la distinction cote UI.
function deriveDisplayStatus(row: BillingSyncRow): string {
  if (row.status !== 'denied') return row.status
  const cancelledByOperator = (row.data as { cancelled_by_operator?: boolean })?.cancelled_by_operator
  return cancelledByOperator ? 'cancelled' : 'denied'
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
  const [editingQuote, setEditingQuote] = useState<QuoteFormInitialValues | null>(null)

  function buildEditInitialValues(row: BillingSyncRow): QuoteFormInitialValues | null {
    if (!row.client_id) return null
    const data = row.data as {
      invoice_lines?: unknown
      pdf_invoice_free_text?: string | null
    }
    // Pennylane V2 retourne invoice_lines en lazy (juste { url }) → on ne peut pas les
    // recuperer ici sans fetch additionnel. Pour MVP, on recharge depuis billing_sync
    // qui contient les lignes mappees a la creation, ou on affiche un message vide.
    const lineItemsRaw = Array.isArray(data.invoice_lines) ? data.invoice_lines : []
    const lineItems: LineItem[] = (lineItemsRaw as Record<string, unknown>[]).map((li) => ({
      label: String(li.label ?? ''),
      description: (li.description as string | null) ?? null,
      quantity: Number(li.quantity ?? 1),
      unit: String(li.unit ?? 'piece'),
      unitPrice: Number(li.raw_currency_unit_price ?? li.unit_price ?? 0),
      vatRate: String(li.vat_rate ?? 'FR_200'),
      total: Number(li.quantity ?? 1) * Number(li.raw_currency_unit_price ?? li.unit_price ?? 0),
    }))

    const fallbackLineItems: LineItem[] =
      lineItems.length > 0
        ? lineItems
        : [
            {
              label: 'Ligne devis',
              description: null,
              quantity: 1,
              unit: 'piece',
              unitPrice: row.amount ? row.amount / 100 : 0,
              vatRate: 'FR_200',
              total: row.amount ? row.amount / 100 : 0,
            },
          ]

    const quoteType = ((row.data as { quote_type?: QuoteType })?.quote_type ?? 'one_direct_deposit') as QuoteType

    return {
      pennylaneQuoteId: row.pennylane_id,
      clientId: row.client_id,
      quoteType,
      lineItems: fallbackLineItems,
      publicNotes: data.pdf_invoice_free_text ?? null,
    }
  }

  function handleEdit(row: BillingSyncRow) {
    const initial = buildEditInitialValues(row)
    if (!initial) {
      showError('Impossible de modifier ce devis (client introuvable)')
      return
    }
    setEditingQuote(initial)
  }

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
            const quoteData = row.data as {
              quote_number?: string
              date?: string
              deadline?: string
              public_file_url?: string | null
            }
            const clientName = clients?.find((c) => c.id === row.client_id)?.name ?? null
            const displayStatus = deriveDisplayStatus(row)
            const pdfUrl = quoteData.public_file_url ?? null
            return (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      {pdfUrl ? (
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline truncate"
                          title="Consulter le devis (PDF Pennylane)"
                        >
                          {quoteData.quote_number ?? row.pennylane_id}
                        </a>
                      ) : (
                        <span className="text-sm font-medium truncate">{quoteData.quote_number ?? row.pennylane_id}</span>
                      )}
                      {clientName && (
                        <span className="text-xs text-muted-foreground truncate">— {clientName}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(quoteData.date)}</span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[displayStatus] ?? STATUS_CLASSES.draft}`}
                  >
                    {STATUS_LABELS[displayStatus] ?? displayStatus}
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
                        onClick={() => handleEdit(row)}
                        className="rounded-md bg-muted px-2.5 py-1 text-xs text-foreground hover:bg-muted/70"
                      >
                        Modifier
                      </button>
                    )}
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

      {/* Story 13.4 patch — Modale d'edition de devis (mode update) */}
      <Dialog open={editingQuote !== null} onOpenChange={(open) => !open && setEditingQuote(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le devis</DialogTitle>
          </DialogHeader>
          {editingQuote && (
            <QuoteForm
              clients={clients ?? []}
              initialValues={editingQuote}
              onSuccess={() => setEditingQuote(null)}
            />
          )}
        </DialogContent>
      </Dialog>
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
