'use client'

import { useTransition } from 'react'
import { Skeleton, showSuccess, showError } from '@monprojetpro/ui'
import { useBillingSyncRows } from '../hooks/use-billing'
import { triggerClientBillingSync } from '../actions/trigger-client-billing-sync'
import type { BillingSyncRow, ClientWithPennylane } from '../types/billing.types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  paid: 'Payée',
  unpaid: 'Impayée',
}

const LAB_INVOICE_TAG = '[FOXEO_LAB]'

function isLabInvoiceRow(row: BillingSyncRow): boolean {
  const data = row.data as { pdf_invoice_free_text?: string; is_lab_invoice?: boolean }
  return data.is_lab_invoice === true ||
    (typeof data.pdf_invoice_free_text === 'string' && data.pdf_invoice_free_text.includes(LAB_INVOICE_TAG))
}

const STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-blue-500/10 text-blue-500',
  paid: 'bg-green-500/10 text-green-500',
  unpaid: 'bg-destructive/10 text-destructive',
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

type InvoicesListProps = {
  clientId?: string
  showRefreshButton?: boolean
  clients?: ClientWithPennylane[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InvoicesList({ clientId, showRefreshButton = false, clients }: InvoicesListProps) {
  const { data: rows, isPending, isError, refetch } = useBillingSyncRows('invoice', clientId)
  const [isSyncing, startTransition] = useTransition()

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">
        Erreur lors du chargement des factures
      </div>
    )
  }

  const allRows = rows ?? []

  function handleRefresh() {
    startTransition(async () => {
      const result = await triggerClientBillingSync()
      if (result.error) {
        showError(result.error.message)
      } else {
        showSuccess('Factures synchronisées')
        refetch()
      }
    })
  }

  if (allRows.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {showRefreshButton && <RefreshButton onClick={handleRefresh} loading={isSyncing} />}
        <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          Aucune facture trouvée
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {showRefreshButton && <RefreshButton onClick={handleRefresh} loading={isSyncing} />}

      <div className="flex flex-col gap-2">
        {allRows.map((row) => (
          <InvoiceRow key={row.id} row={row} clients={clients} />
        ))}
      </div>
    </div>
  )
}

// ── Invoice Row ───────────────────────────────────────────────────────────────

function InvoiceRow({ row, clients }: { row: BillingSyncRow; clients?: ClientWithPennylane[] }) {
  const invoiceData = row.data as {
    invoice_number?: string
    date?: string
    file_url?: string
    public_file_url?: string
    payment_url?: string
    lab_deduction_applied?: boolean
  }
  const isLab = isLabInvoiceRow(row)
  const clientName = clients?.find((c) => c.id === row.client_id)?.name ?? null
  const pdfUrl = invoiceData.file_url ?? invoiceData.public_file_url ?? null
  const invoiceNumber = invoiceData.invoice_number ?? row.pennylane_id

  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-accent/30 transition-colors">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {pdfUrl ? (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline truncate"
                title="Consulter la facture (PDF)"
              >
                {invoiceNumber}
              </a>
            ) : (
              <span className="text-sm font-medium truncate">{invoiceNumber}</span>
            )}
            {clientName && (
              <span className="text-xs text-muted-foreground truncate">— {clientName}</span>
            )}
            {isLab && (
              <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400">
                Lab
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{formatDate(invoiceData.date)}</span>
          {isLab && row.status === 'paid' && invoiceData.lab_deduction_applied && (
            <span className="text-[10px] text-muted-foreground">Déduit du setup One</span>
          )}
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${STATUS_CLASSES[row.status] ?? STATUS_CLASSES.draft}`}
        >
          {STATUS_LABELS[row.status] ?? row.status}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold tabular-nums">{formatAmount(row.amount)}</span>

        <div className="flex items-center gap-2">
          {invoiceData.file_url && (
            <a
              href={invoiceData.file_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Télécharger PDF"
              className="rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"
            >
              Télécharger PDF
            </a>
          )}

          {row.status === 'unpaid' && invoiceData.payment_url && (
            <a
              href={invoiceData.payment_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Payer maintenant"
              className="rounded-md bg-primary/10 px-2.5 py-1 text-xs text-primary hover:bg-primary/20 transition-colors"
            >
              Payer maintenant
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Refresh Button ────────────────────────────────────────────────────────────

function RefreshButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
      >
        {loading ? 'Synchronisation...' : 'Rafraîchir'}
      </button>
    </div>
  )
}
