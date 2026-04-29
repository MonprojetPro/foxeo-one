'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@monprojetpro/ui'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { getClientParcoursAgents } from '../actions/get-client-parcours-agents'
import { reorderParcoursStep } from '../actions/reorder-parcours-step'
import { LaunchParcoursModal } from './launch-parcours-modal'
import { AddStepModal } from './add-step-modal'
import { InjectStepContextPanel } from '@monprojetpro/module-elio'
import { getStepContextCounts } from '../actions/get-step-context-counts'
import type { ClientParcoursAgentWithDetails, ClientParcoursAgentStatus } from '../types/parcours.types'

interface ClientParcoursAgentsListProps {
  clientId: string
}

const STATUS_LABELS: Record<ClientParcoursAgentStatus, string> = {
  pending: 'En attente',
  active: 'En cours',
  completed: 'Terminé',
  skipped: 'Ignoré',
}

const STATUS_CLASSES: Record<ClientParcoursAgentStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  active: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
  completed: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  skipped: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
}

interface ActivePanel {
  parcoursAgentId: string
  stepLabel: string
}

export function ClientParcoursAgentsList({ clientId }: ClientParcoursAgentsListProps) {
  const [showLaunchModal, setShowLaunchModal] = useState(false)
  const [showAddStepModal, setShowAddStepModal] = useState(false)
  const [activePanel, setActivePanel] = useState<ActivePanel | null>(null)
  const [reordering, setReordering] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: steps, isLoading, error } = useQuery({
    queryKey: ['client-parcours-agents', clientId],
    queryFn: async () => {
      const result = await getClientParcoursAgents({ clientId })
      if (result.error) throw new Error(result.error.message)
      return result.data ?? []
    },
    staleTime: 2 * 60 * 1_000,
  })

  const { data: contextCounts } = useQuery({
    queryKey: ['step-context-counts', clientId],
    queryFn: async () => {
      const result = await getStepContextCounts(clientId)
      if (result.error) return {}
      return result.data ?? {}
    },
    enabled: !!steps && steps.length > 0,
    staleTime: 60 * 1_000,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['client-parcours-agents', clientId] })
  }

  async function handleReorder(stepId: string, direction: 'up' | 'down') {
    setReordering(stepId)
    try {
      await reorderParcoursStep({ stepId, clientId, direction })
      invalidate()
    } finally {
      setReordering(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3" aria-label="Chargement du parcours">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
        Impossible de charger le parcours de ce client.
      </div>
    )
  }

  const hasSteps = steps && steps.length > 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Parcours Élio Lab</h3>
          {hasSteps && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {steps.length} étape{steps.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {hasSteps && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddStepModal(true)}
            aria-label="Ajouter une étape au parcours"
          >
            + Ajouter une étape
          </Button>
        )}
      </div>

      {/* État vide → bouton Lancer le Lab */}
      {!hasSteps && (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Aucun parcours configuré pour ce client.
          </p>
          <Button
            onClick={() => setShowLaunchModal(true)}
            aria-label="Lancer le Lab et composer le parcours"
          >
            Lancer le Lab
          </Button>
        </div>
      )}

      {/* Liste des étapes */}
      {hasSteps && (
        <ol className="space-y-2">
          {(steps as ClientParcoursAgentWithDetails[]).map((step, index) => {
            const pendingCount = contextCounts?.[step.id] ?? 0
            const isFirst = index === 0
            const isLast = index === (steps as ClientParcoursAgentWithDetails[]).length - 1
            const isReordering = reordering === step.id

            return (
              <li
                key={step.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
              >
                {/* Numéro étape */}
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground"
                  aria-hidden="true"
                >
                  {step.stepOrder}
                </div>

                {/* Image agent */}
                {step.agentImagePath ? (
                  <img
                    src={step.agentImagePath}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                    aria-hidden="true"
                  />
                ) : (
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground"
                    aria-hidden="true"
                  >
                    {step.agentName.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{step.agentName}</p>
                  <p className="text-sm font-medium text-foreground truncate">{step.stepLabel}</p>
                </div>

                {/* Badge contextes en attente */}
                {pendingCount > 0 && (
                  <span
                    className="shrink-0 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-xs font-medium text-amber-400"
                    aria-label={`${pendingCount} contexte${pendingCount > 1 ? 's' : ''} injecté${pendingCount > 1 ? 's' : ''}`}
                  >
                    {pendingCount} contexte{pendingCount > 1 ? 's' : ''}
                  </span>
                )}

                {/* Statut */}
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[step.status]}`}
                  aria-label={`Statut : ${STATUS_LABELS[step.status]}`}
                >
                  {STATUS_LABELS[step.status]}
                </span>

                {/* Boutons réordonnancement */}
                <div className="flex shrink-0 flex-col gap-0.5">
                  <button
                    onClick={() => handleReorder(step.id, 'up')}
                    disabled={isFirst || isReordering}
                    aria-label="Monter l'étape"
                    className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-20"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleReorder(step.id, 'down')}
                    disabled={isLast || isReordering}
                    aria-label="Descendre l'étape"
                    className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-20"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Bouton Nourrir Élio */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActivePanel({ parcoursAgentId: step.id, stepLabel: step.stepLabel })}
                  aria-label={`Nourrir Élio pour l'étape ${step.stepLabel}`}
                  className="shrink-0 text-xs"
                >
                  Nourrir Élio
                </Button>
              </li>
            )
          })}
        </ol>
      )}

      {/* Panneau injection */}
      {activePanel && (
        <InjectStepContextPanel
          parcoursAgentId={activePanel.parcoursAgentId}
          clientId={clientId}
          stepLabel={activePanel.stepLabel}
          open={true}
          onClose={() => setActivePanel(null)}
        />
      )}

      {/* Modals */}
      {showLaunchModal && (
        <LaunchParcoursModal
          clientId={clientId}
          onClose={() => setShowLaunchModal(false)}
          onLaunched={() => {
            setShowLaunchModal(false)
            invalidate()
          }}
        />
      )}

      {showAddStepModal && (
        <AddStepModal
          clientId={clientId}
          onClose={() => setShowAddStepModal(false)}
          onAdded={() => {
            setShowAddStepModal(false)
            invalidate()
          }}
        />
      )}
    </div>
  )
}
