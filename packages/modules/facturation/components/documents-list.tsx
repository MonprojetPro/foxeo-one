'use client'

import { Skeleton } from '@monprojetpro/ui'
import { useBillingSyncRows } from '../hooks/use-billing'
import { PdfDownloadButton } from './pdf-download-button'
import { EmptyAccounting } from './empty-accounting'
import type { BillingSyncRow } from '../types/billing.types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  paid: 'Payée',
  unpaid: 'Impayée',
  accepted: 'Accepté',
  denied: 'Refusé',
}

const STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-blue-500/10 text-blue-500',
  paid: 'bg-green-500/10 text-green-500',
  unpaid: 'bg-destructive/10 text-destructive',
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

// Les casts `as` ci-dessous sont intentionnels : billing_sync.data est un JSONB libre
// dont la structure dépend de entity_type (quote vs invoice). Pas de schéma TypeScript strict possible.
function getDocumentNumber(row: BillingSyncRow): string {
  const d = row.data as Record<string, unknown>
  const num = row.entity_type === 'quote'
    ? (typeof d.quote_number === 'string' ? d.quote_number : undefined)
    : (typeof d.invoice_number === 'string' ? d.invoice_number : undefined)
  return num ?? row.pennylane_id
}

function getDocumentDate(row: BillingSyncRow): string | undefined {
  const d = row.data as Record<string, unknown>
  return typeof d.date === 'string' ? d.date : undefined
}

function getFileUrl(row: BillingSyncRow): string | undefined {
  const d = row.data as Record<string, unknown>
  return typeof d.file_url === 'string' ? d.file_url : undefined
}

// ── Props ─────────────────────────────────────────────────────────────────────

type DocumentsListProps = {
  clientId: string
}

// ── Row sub-component ─────────────────────────────────────────────────────────

function DocumentRow({ row }: { row: BillingSyncRow }) {
  const isQuote = row.entity_type === 'quote'
  const docNumber = getDocumentNumber(row)
  const docDate = getDocumentDate(row)
  const fileUrl = getFileUrl(row)

  return (
    <div
      data-testid="document-row"
      className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-accent/30 transition-colors"
    >
      <div className="flex items-center gap-4">
        {/* Type badge */}
        <span
          data-testid="document-type-badge"
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            isQuote
              ? 'bg-violet-500/10 text-violet-400'
              : 'bg-cyan-500/10 text-cyan-400'
          }`}
        >
          {isQuote ? 'Devis' : 'Facture'}
        </span>

        <div className="flex flex-col">
          <span className="text-sm font-medium" data-testid="document-number">
            {docNumber}
          </span>
          <span className="text-xs text-muted-foreground">{formatDate(docDate)}</span>
        </div>

        <span
          data-testid="document-status-badge"
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[row.status] ?? STATUS_CLASSES.draft}`}
        >
          {STATUS_LABELS[row.status] ?? row.status}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold tabular-nums">{formatAmount(row.amount)}</span>
        <PdfDownloadButton fileUrl={fileUrl} />
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DocumentsList({ clientId }: DocumentsListProps) {
  const { data: quotes = [], isPending: quotesLoading, isError: quotesError } = useBillingSyncRows('quote', clientId)
  const { data: invoices = [], isPending: invoicesLoading, isError: invoicesError } = useBillingSyncRows('invoice', clientId)

  const isPending = quotesLoading || invoicesLoading
  const isError = quotesError || invoicesError

  if (isPending) {
    return (
      <div className="flex flex-col gap-3" data-testid="documents-skeleton">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    )
  }

  if (isError) {
    return (
      <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Impossible de charger vos documents. Veuillez réessayer.
      </div>
    )
  }

  // Tri chronologique décroissant — New Date() pour éviter un tri lexicographique instable
  // entre les dates YYYY-MM-DD (Pennylane) et les timestamps ISO (created_at)
  const allDocuments = [...quotes, ...invoices].sort((a, b) => {
    const dateA = new Date((a.data as { date?: string }).date ?? a.created_at).getTime()
    const dateB = new Date((b.data as { date?: string }).date ?? b.created_at).getTime()
    return dateB - dateA
  })

  if (allDocuments.length === 0) {
    return <EmptyAccounting />
  }

  return (
    <ul role="list" className="flex flex-col gap-2" data-testid="documents-list">
      {allDocuments.map((row) => (
        <li key={row.id}>
          <DocumentRow row={row} />
        </li>
      ))}
    </ul>
  )
}
