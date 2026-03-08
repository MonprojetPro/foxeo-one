'use client'

import { useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Skeleton, showSuccess, showError } from '@foxeo/ui'
import { getClientLabStatus } from '../actions/get-client-lab-status'
import { sendLabInvoice } from '../actions/send-lab-invoice'

// ── Props ─────────────────────────────────────────────────────────────────────

type LabBillingTabProps = {
  clientId: string
  clientName: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LabBillingTab({ clientId, clientName }: LabBillingTabProps) {
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  const { data: labStatus, isPending: isLoading } = useQuery({
    queryKey: ['billing', 'lab-status', clientId],
    queryFn: async () => {
      const result = await getClientLabStatus(clientId)
      if (result.error) throw new Error(result.error.message)
      return result.data!
    },
    staleTime: 5 * 60 * 1_000,
  })

  function handleSendLabInvoice() {
    startTransition(async () => {
      const result = await sendLabInvoice(clientId)
      if (result.error) {
        showError(result.error.message)
        return
      }
      showSuccess(`Facture Lab envoyée à ${clientName}`)
      queryClient.invalidateQueries({ queryKey: ['billing', 'lab-status', clientId] })
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
    )
  }

  const labPaid = labStatus?.labPaid ?? false
  const labPaidAt = labStatus?.labPaidAt ?? null

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Forfait Lab — 199€</h3>
        <p className="text-sm text-muted-foreground">
          Facturez le forfait d&apos;accès Lab au client. Ce montant sera déduit du setup One si le client gradue.
        </p>
      </div>

      {labPaid ? (
        <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
          <span className="text-green-400">✓</span>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-green-400">Lab payé</span>
            {labPaidAt && (
              <span className="text-xs text-muted-foreground">
                le {new Date(labPaidAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
            <span className="text-sm text-muted-foreground">Le client n&apos;a pas encore payé le forfait Lab.</span>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={handleSendLabInvoice}
            className="w-fit rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            aria-label={`Facturer le Lab à ${clientName}`}
          >
            {isPending ? 'Envoi en cours...' : 'Facturer le Lab (199€)'}
          </button>
        </div>
      )}
    </div>
  )
}
