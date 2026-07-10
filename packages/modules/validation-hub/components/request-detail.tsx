'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, MessageSquare } from 'lucide-react'
import { CockpitCallout, BlockSkeleton } from '@monprojetpro/ui'
import { useValidationRequest } from '../hooks/use-validation-request'
import { RequestHeader } from './request-header'
import { ClientInfoCard } from './client-info-card'
import { RequestContent } from './request-content'
import { RequestHistory } from './request-history'
import { RequestExchanges } from './request-exchanges'
import { RequestActions } from './request-actions'
import { ApproveDialog } from './approve-dialog'
import { RejectDialog } from './reject-dialog'
import { ClarificationDialog } from './clarification-dialog'
import { ActionPicker } from './action-picker'
import type { ExchangeEntry } from './request-exchanges'
import { FeedbackInjectionForm } from '@monprojetpro/module-parcours'

type RequestDetailProps = {
  requestId: string
}

export function RequestDetail({ requestId }: RequestDetailProps) {
  const { request, isLoading, error } = useValidationRequest(requestId)
  const queryClient = useQueryClient()
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [isClarificationOpen, setIsClarificationOpen] = useState(false)

  if (isLoading) {
    return <RequestDetailSkeleton />
  }

  if (error) {
    return (
      <div className="p-6">
        <CockpitCallout tone="red" icon={AlertCircle} title="Impossible de charger la demande">
          {error.message}
        </CockpitCallout>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="p-6">
        <CockpitCallout tone="gray" icon={AlertCircle} title="Demande introuvable">
          Cette demande n&apos;existe pas ou vous n&apos;y avez pas accès.
        </CockpitCallout>
      </div>
    )
  }

  // Build exchanges from reviewer_comment (needs_clarification and resubmission cases)
  const exchanges: ExchangeEntry[] = []
  if (request.reviewerComment && request.reviewedAt) {
    exchanges.push({
      date: request.reviewedAt,
      actor: 'MiKL',
      action: 'a demandé des précisions :',
      comment: request.reviewerComment,
    })
    // If the status is back to 'pending', the client has resubmitted after the clarification
    if (request.status === 'pending') {
      exchanges.push({
        date: request.updatedAt,
        actor: 'Client',
        action: 'a re-soumis avec :',
        comment: request.content,
      })
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Scrollable content */}
      <div className="flex-1 p-6 pb-24 space-y-6">
        {/* Section 1 — En-tête */}
        <RequestHeader
          title={request.title}
          type={request.type}
          status={request.status}
          submittedAt={request.submittedAt}
        />

        {/* Raccourci vers le chat MiKL ↔ Client — utilisé pour les demandes de précisions
            (la question MiKL est envoyée dans le chat, la réponse client arrive aussi là). */}
        <Link
          href={`/modules/chat/${request.clientId}`}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-300 transition-colors hover:border-blue-500/50 hover:bg-blue-500/20"
          aria-label={`Ouvrir le chat avec ${request.client.name}`}
        >
          <MessageSquare className="h-4 w-4" />
          Ouvrir le chat avec {request.client.name}
        </Link>

        {/* Responsive layout: 1 col mobile, 2 col desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6">
          {/* Colonne principale */}
          <div className="space-y-6">
            {/* Section 2 — Informations client */}
            <ClientInfoCard
              client={request.client}
              parcours={request.parcours}
            />

            {/* Section 3 — Contenu de la demande */}
            <RequestContent
              content={request.content}
              documents={request.documents}
            />

            {/* Section Échanges (précisions demandées / re-soumissions) */}
            {exchanges.length > 0 && (
              <RequestExchanges exchanges={exchanges} />
            )}

            {/* Section Injection MiKL — disponible si step_id présent et demande non approuvée */}
            {request.stepId && request.status !== 'approved' && (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <h3 className="mb-1 text-sm font-semibold text-white">
                  Envoyer un message à Élio
                </h3>
                <p className="mb-4 text-xs text-gray-400">
                  Feedback texte visible dans l&apos;historique, ou feuille de route cachée qui oriente Élio et renvoie l&apos;étape au client.
                </p>
                <FeedbackInjectionForm
                  stepId={request.stepId}
                  clientId={request.clientId}
                  onSuccess={() => {
                    // L'injection d'une feuille de route passe la demande à 'rejected' côté base
                    // (étape renvoyée au client). On réinvalide pour que la barre d'actions reflète
                    // le nouveau statut (Valider grisé) au lieu de rester sur 'pending'.
                    queryClient.invalidateQueries({ queryKey: ['validation-request', requestId] })
                    queryClient.invalidateQueries({ queryKey: ['validation-requests'] })
                  }}
                />
              </div>
            )}
          </div>

          {/* Colonne historique */}
          <div className="space-y-6">
            {/* Section 4 — Historique pertinent */}
            <RequestHistory
              clientId={request.clientId}
              requestId={request.id}
              clientName={request.client.name}
            />
          </div>
        </div>
      </div>

      {/* Zone boutons sticky */}
      <RequestActions
        status={request.status}
        onValidate={() => setIsApproveOpen(true)}
        onRefuse={() => setIsRejectOpen(true)}
        onRequestClarification={() => setIsClarificationOpen(true)}
        treatmentActionSlot={
          <ActionPicker
            requestId={request.id}
            clientId={request.clientId}
            parcoursId={request.parcoursId}
            requestTitle={request.title}
            clientName={request.client.name}
            disabled={request.status === 'rejected'}
          />
        }
      />

      {/* Modales validation / refus */}
      <ApproveDialog
        open={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        requestId={request.id}
        clientId={request.clientId}
        title={request.title}
        clientName={request.client.name}
        type={request.type}
      />

      <RejectDialog
        open={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        requestId={request.id}
        clientId={request.clientId}
        title={request.title}
        clientName={request.client.name}
        type={request.type}
      />

      <ClarificationDialog
        open={isClarificationOpen}
        onClose={() => setIsClarificationOpen(false)}
        requestId={request.id}
        title={request.title}
        clientName={request.client.name}
        type={request.type}
      />
    </div>
  )
}

// Squelette de chargement cockpit pour la page de détail
function RequestDetailSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* En-tête */}
      <BlockSkeleton className="h-24 w-full" />
      {/* Layout 2 colonnes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[70%_30%]">
        <div className="space-y-6">
          <BlockSkeleton className="h-36 w-full" />
          <BlockSkeleton className="h-72 w-full" />
        </div>
        <div className="space-y-6">
          <BlockSkeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  )
}
