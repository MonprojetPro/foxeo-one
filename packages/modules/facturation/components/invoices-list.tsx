'use client'

import { useState, useTransition } from 'react'
import { Skeleton, showSuccess, showError } from '@monprojetpro/ui'
import { useBillingSyncRows } from '../hooks/use-billing'
import { triggerClientBillingSync } from '../actions/trigger-client-billing-sync'
import { CreditNoteModal } from './credit-note-modal'
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
  /**
   * T-041 — affiche l'action « Émettre un avoir ».
   *
   * 🔴 DEFAUT `false`, ET CE DEFAUT EST LE SUJET : ce composant est rendu
   * TEL QUEL dans l'app CLIENT — `apps/client/.../modules/facturation/page.tsx`
   * et `.../settings/billing/page.tsx`. Un bouton d'avoir pose sans condition
   * serait donc visible par le client lui-meme. `assertOperator` protege bien
   * le serveur, mais un bouton qui n'aboutit qu'a « Accès réservé » n'a rien a
   * faire sous les yeux d'un client. Seul le Hub passe `allowCreditNote`.
   */
  allowCreditNote?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InvoicesList({
  clientId,
  showRefreshButton = false,
  clients,
  allowCreditNote = false,
}: InvoicesListProps) {
  // T-041c — les AVOIRS sont charges avec les factures. Ils vivent sous un
  // autre `entity_type`, donc la liste ne les voyait pas : l'avoir F-2026-102
  // existait en base et n'apparaissait nulle part a l'ecran.
  const { data: rows, isPending, isError, refetch } = useBillingSyncRows(
    ['invoice', 'credit_note'],
    clientId
  )
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

  // T-041c — quelles factures portent deja un avoir ? La garde serveur refuse
  // de toute facon un second avoir (ALREADY_CREDITED), mais proposer un bouton
  // qui ne peut qu'echouer est une promesse qu'on ne tient pas.
  const creditedInvoiceIds = new Set(
    allRows
      .filter((r) => r.entity_type === 'credit_note')
      .map((r) => (r.data as { credited_invoice_pennylane_id?: string })?.credited_invoice_pennylane_id)
      .filter((id): id is string => Boolean(id))
  )

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
          <InvoiceRow
            key={row.id}
            row={row}
            clients={clients}
            allowCreditNote={allowCreditNote}
            alreadyCredited={creditedInvoiceIds.has(row.pennylane_id)}
          />
        ))}
      </div>
    </div>
  )
}

// ── Invoice Row ───────────────────────────────────────────────────────────────

function InvoiceRow({
  row,
  clients,
  allowCreditNote = false,
  alreadyCredited = false,
}: {
  row: BillingSyncRow
  clients?: ClientWithPennylane[]
  allowCreditNote?: boolean
  alreadyCredited?: boolean
}) {
  const [showCreditModal, setShowCreditModal] = useState(false)
  const invoiceData = row.data as {
    invoice_number?: string
    date?: string
    file_url?: string
    public_file_url?: string
    payment_url?: string
    lab_deduction_applied?: boolean
    credited_invoice_number?: string
  }
  // T-041c — un avoir n'est pas une facture : il ne se credite pas lui-meme,
  // et son montant negatif doit se lire comme tel.
  const isCreditNote = row.entity_type === 'credit_note'
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
            {isCreditNote && (
              <span className="rounded-full bg-orange-400/15 px-2 py-0.5 text-[10px] font-medium text-orange-300">
                Avoir
              </span>
            )}
            {alreadyCredited && !isCreditNote && (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                Annulée par un avoir
              </span>
            )}
          </div>
          {isCreditNote && invoiceData.credited_invoice_number && (
            <span className="text-[10px] text-muted-foreground">
              Annule la facture {invoiceData.credited_invoice_number}
            </span>
          )}
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

          {/* T-041 — opérateur uniquement, voir le commentaire sur allowCreditNote.
              T-041c — jamais sur un avoir (il ne se crédite pas lui-même), et
              désactivé si la facture en porte déjà un : le serveur refuserait
              de toute façon, et un bouton qui ne peut qu'échouer est une
              promesse qu'on ne tient pas. */}
          {allowCreditNote && !isCreditNote && (
            <button
              type="button"
              onClick={() => setShowCreditModal(true)}
              disabled={alreadyCredited}
              title={
                alreadyCredited
                  ? 'Cette facture a déjà un avoir — pour une correction supplémentaire, émets une nouvelle facture'
                  : undefined
              }
              aria-label={`Émettre un avoir sur la facture ${invoiceNumber}`}
              data-testid="credit-note-button"
              className="rounded-md border border-orange-400/30 bg-orange-400/10 px-2.5 py-1 text-xs text-orange-300 hover:bg-orange-400/20 transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-orange-400/10"
            >
              {alreadyCredited ? 'Avoir déjà émis' : 'Émettre un avoir'}
            </button>
          )}
        </div>
      </div>

      {showCreditModal && (
        <CreditNoteModal invoice={row} onClose={() => setShowCreditModal(false)} />
      )}
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
