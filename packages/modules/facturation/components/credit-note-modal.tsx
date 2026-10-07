'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { showSuccess, showError } from '@monprojetpro/ui'
import { createCreditNote } from '../actions/create-credit-note'
import type { BillingSyncRow } from '../types/billing.types'

// ============================================================
// CreditNoteModal — T-041
//
// Emission d'un avoir sur une facture. C'est la SEULE facon d'annuler une
// facture emise : la numerotation sequentielle est une obligation legale, on
// ne retire jamais un numero de la suite. D'ou le ton de l'ecran, qui explique
// plutot qu'il ne demande une confirmation seche.
// ============================================================

interface CreditNoteModalProps {
  invoice: BillingSyncRow
  onClose: () => void
}

function euros(cents: number | null): string {
  return ((cents ?? 0) / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

export function CreditNoteModal({ invoice, onClose }: CreditNoteModalProps) {
  const invoiceData = (invoice.data ?? {}) as { invoice_number?: string }
  const invoiceNumber = invoiceData.invoice_number ?? invoice.pennylane_id

  const [reason, setReason] = useState('')
  const [mode, setMode] = useState<'full' | 'partial'>('full')
  const [amount, setAmount] = useState('')
  const [isSubmitting, startSubmit] = useTransition()
  const queryClient = useQueryClient()

  const parsedAmount = amount.trim() === '' ? null : Number(amount)
  const amountInvalid =
    mode === 'partial' && (parsedAmount == null || !Number.isFinite(parsedAmount) || parsedAmount <= 0)

  const canSubmit = reason.trim().length > 0 && !amountInvalid && !isSubmitting

  function handleSubmit() {
    startSubmit(async () => {
      const result = await createCreditNote(invoice.id, {
        reason: reason.trim(),
        amount: mode === 'partial' ? parsedAmount : null,
      })

      if (result.error) {
        showError(result.error.message)
        return
      }

      const number = result.data?.creditNoteNumber
      showSuccess(
        number
          ? `Avoir ${number} émis sur la facture ${invoiceNumber}`
          : `Avoir émis sur la facture ${invoiceNumber}`
      )

      // Le lien machine avec la facture d'origine peut avoir ete refuse par
      // l'API : on le DIT plutot que de laisser croire a un rattachement.
      if (result.data?.linkedToInvoice === false) {
        showError(
          `L'avoir est valide mais Pennylane n'a pas accepté le rattachement automatique à ${invoiceNumber}. La référence est imprimée sur le document — vérifie le lien dans Pennylane.`
        )
      }

      // T-041b — un miroir non ecrit rend l'avoir invisible dans le Hub ET
      // neutralise la garde anti-double-avoir. Ca ne peut pas rester silencieux.
      if (result.data?.mirrored === false) {
        showError(
          `L'avoir est bien créé chez Pennylane, mais il n'a PAS pu être enregistré dans le Hub : il n'apparaîtra pas dans la liste, et rien n'empêchera d'en créer un second sur la même facture. À signaler avant de recommencer.`
        )
      }

      await queryClient.invalidateQueries({ queryKey: ['billing'] })
      onClose()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      data-testid="credit-note-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="bg-background rounded-xl border border-border shadow-xl w-full max-w-lg mx-4"
        data-testid="credit-note-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="credit-note-title"
      >
        <div className="flex flex-col gap-4 p-6">
          <div>
            <h2 id="credit-note-title" className="text-base font-semibold">
              Émettre un avoir sur {invoiceNumber}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Une facture émise ne se supprime pas — la numérotation est séquentielle et
              c&apos;est une obligation légale. L&apos;avoir est le document qui l&apos;annule :
              les deux restent dans la comptabilité, et la correction est tracée.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Montant de la facture</span>
              <span className="font-semibold tabular-nums">{euros(invoice.amount)}</span>
            </div>
          </div>

          {/* Portée */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium mb-1">Portée de l&apos;avoir</legend>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="credit-mode"
                value="full"
                checked={mode === 'full'}
                onChange={() => setMode('full')}
                data-testid="credit-mode-full"
                className="mt-1"
              />
              <span>
                <span className="font-medium">Annuler toute la facture</span>
                <span className="block text-xs text-muted-foreground">
                  Les lignes d&apos;origine sont reprises et inversées, pour que l&apos;avoir
                  reflète exactement ce qu&apos;il annule.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="credit-mode"
                value="partial"
                checked={mode === 'partial'}
                onChange={() => setMode('partial')}
                data-testid="credit-mode-partial"
                className="mt-1"
              />
              <span>
                <span className="font-medium">Créditer un montant précis</span>
                <span className="block text-xs text-muted-foreground">
                  Une seule ligne négative, pour un geste ou une correction partielle.
                </span>
              </span>
            </label>
          </fieldset>

          {mode === 'partial' && (
            <div className="flex flex-col gap-1">
              <label htmlFor="credit-amount" className="text-sm font-medium">
                Montant HT à créditer (€)
              </label>
              <input
                id="credit-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="credit-amount"
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          )}

          {/* Motif */}
          <div className="flex flex-col gap-1">
            <label htmlFor="credit-reason" className="text-sm font-medium">
              Motif (imprimé sur l&apos;avoir)
            </label>
            <textarea
              id="credit-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Erreur de montant, facture remplacée par…"
              data-testid="credit-reason"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
            />
            <span className="text-xs text-muted-foreground">
              Obligatoire. C&apos;est ce que lira le client, et le comptable dans six mois.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              data-testid="credit-note-submit"
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Émission…' : "Émettre l'avoir"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
