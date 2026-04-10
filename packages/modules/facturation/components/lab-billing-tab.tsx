'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Skeleton, showSuccess, showError } from '@monprojetpro/ui'
import { getClientLabStatus } from '../actions/get-client-lab-status'
import { sendLabInvoice } from '../actions/send-lab-invoice'

// ── Props ─────────────────────────────────────────────────────────────────────

type LabBillingTabProps = {
  clientId: string
  clientName: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Step indicator ────────────────────────────────────────────────────────────

type StepStatus = 'done' | 'active' | 'pending'

function Step({ label, detail, status }: { label: string; detail?: string; status: StepStatus }) {
  const colors: Record<StepStatus, string> = {
    done: 'bg-green-500 border-green-500',
    active: 'bg-primary border-primary animate-pulse',
    pending: 'bg-muted border-border',
  }
  const textColor: Record<StepStatus, string> = {
    done: 'text-green-400',
    active: 'text-primary',
    pending: 'text-muted-foreground',
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${colors[status]}`}>
          {status === 'done' && (
            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      <div className="pb-6">
        <p className={`text-sm font-medium ${textColor[status]}`}>{label}</p>
        {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LabBillingTab({ clientId, clientName }: LabBillingTabProps) {
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [showPreview, setShowPreview] = useState(false)

  const { data: labStatus, isPending: isLoading } = useQuery({
    queryKey: ['billing', 'lab-status', clientId],
    queryFn: async () => {
      const result = await getClientLabStatus(clientId)
      if (result.error) throw new Error(result.error.message)
      return result.data!
    },
    staleTime: 5 * 60 * 1_000,
  })

  function handleSendInvoice() {
    startTransition(async () => {
      const result = await sendLabInvoice(clientId)
      if (result.error) {
        showError(result.error.message)
        return
      }
      showSuccess(`Facture Lab envoyée à ${clientName}`)
      setShowPreview(false)
      queryClient.invalidateQueries({ queryKey: ['billing', 'lab-status', clientId] })
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-40" />
      </div>
    )
  }

  const invoiceSent = labStatus?.invoiceSent ?? false
  const labPaid = labStatus?.labPaid ?? false
  const dashboardActivated = labStatus?.dashboardActivated ?? false

  // ── Étapes du timeline ─────────────────────────────────────────────────────

  const step1Status: 'done' | 'active' | 'pending' = invoiceSent ? 'done' : showPreview ? 'active' : 'pending'
  const step2Status: 'done' | 'active' | 'pending' = labPaid ? 'done' : invoiceSent ? 'active' : 'pending'
  const step3Status: 'done' | 'active' | 'pending' = dashboardActivated ? 'done' : labPaid ? 'active' : 'pending'

  const step1Detail = labStatus?.invoiceSentAt
    ? `Envoyée le ${formatDate(labStatus.invoiceSentAt)}`
    : undefined
  const step2Detail = labStatus?.labPaidAt
    ? `Reçu le ${formatDate(labStatus.labPaidAt)}`
    : invoiceSent ? 'En attente du paiement client' : undefined
  const step3Detail = dashboardActivated
    ? 'Dashboard Lab + Élio actifs'
    : labPaid ? 'Activation en cours...' : undefined

  return (
    <div className="flex flex-col gap-6 p-4">

      {/* En-tête */}
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">Processus Lab — 199€</h3>
        <p className="text-sm text-muted-foreground">
          Déclenchez le processus pour activer l&apos;accès Lab du client. Le forfait Lab sera déduit du setup One si le client gradue.
        </p>
      </div>

      {/* Bouton déclencheur — visible seulement si processus pas encore commencé */}
      {!invoiceSent && !showPreview && (
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="w-fit rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Déclencher le processus Lab
        </button>
      )}

      {/* Aperçu de la facture avant envoi */}
      {showPreview && !invoiceSent && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex flex-col gap-4">
          <h4 className="text-sm font-semibold text-primary">Aperçu — Facture Lab</h4>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client</span>
              <span className="font-medium">{clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Description</span>
              <span className="font-medium">Forfait Lab MonprojetPro</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Montant HT</span>
              <span className="font-medium">199,00 €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">TVA (20%)</span>
              <span className="font-medium">39,80 €</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 mt-1">
              <span className="font-semibold">Total TTC</span>
              <span className="font-bold text-primary">238,80 €</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Échéance</span>
              <span>30 jours</span>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              disabled={isPending}
              onClick={handleSendInvoice}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              aria-label={`Envoyer la facture Lab à ${clientName}`}
            >
              {isPending ? 'Envoi en cours...' : 'Envoyer la facture'}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setShowPreview(false)}
              className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 disabled:opacity-50 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Timeline — visible dès que le processus a commencé */}
      {(invoiceSent || showPreview) && (
        <div className="flex flex-col pl-1 pt-2">
          <div className="relative">
            {/* Ligne verticale */}
            <div className="absolute left-[9px] top-5 bottom-5 w-px bg-border" />
            <Step
              label="Facture envoyée"
              detail={step1Detail}
              status={step1Status}
            />
            <Step
              label="Paiement reçu"
              detail={step2Detail}
              status={step2Status}
            />
            <Step
              label="Accès Lab + Élio activés"
              detail={step3Detail}
              status={step3Status}
            />
          </div>
        </div>
      )}
    </div>
  )
}
