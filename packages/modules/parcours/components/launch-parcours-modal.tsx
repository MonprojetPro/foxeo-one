'use client'

import { useState, useTransition } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@monprojetpro/ui'
import { getElioLabAgents } from '@monprojetpro/module-elio'
import { launchClientParcours } from '../actions/launch-client-parcours'
import type { ElioLabAgent } from '@monprojetpro/module-elio'

interface SelectedStep {
  agentId: string
  agentName: string
  agentDescription: string | null
  stepLabel: string
}

interface LaunchParcoursModalProps {
  clientId: string
  onClose: () => void
  onLaunched: () => void
}

export function LaunchParcoursModal({ clientId, onClose, onLaunched }: LaunchParcoursModalProps) {
  const [selectedSteps, setSelectedSteps] = useState<SelectedStep[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const { data: agents, isLoading } = useQuery({
    queryKey: ['elio-lab-agents'],
    queryFn: async () => {
      const result = await getElioLabAgents({ includeArchived: false })
      if (result.error) throw new Error(result.error.message)
      return result.data ?? []
    },
    staleTime: 5 * 60 * 1_000,
  })

  function addAgent(agent: ElioLabAgent) {
    const defaultLabel = agent.name
    setSelectedSteps(prev => [...prev, {
      agentId: agent.id,
      agentName: agent.name,
      agentDescription: agent.description,
      stepLabel: defaultLabel,
    }])
  }

  function removeStep(index: number) {
    setSelectedSteps(prev => prev.filter((_, i) => i !== index))
  }

  function moveUp(index: number) {
    if (index === 0) return
    setSelectedSteps(prev => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  function moveDown(index: number) {
    setSelectedSteps(prev => {
      if (index === prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  function updateLabel(index: number, value: string) {
    setSelectedSteps(prev => {
      const next = [...prev]
      next[index] = { ...next[index], stepLabel: value }
      return next
    })
  }

  function handleLaunch() {
    setError(null)

    if (selectedSteps.length === 0) {
      setError('Veuillez sélectionner au moins un agent.')
      return
    }

    startTransition(async () => {
      const result = await launchClientParcours({
        clientId,
        steps: selectedSteps.map(s => ({ agentId: s.agentId, stepLabel: s.stepLabel })),
      })

      if (result.error) {
        setError(result.error.message)
        return
      }

      onLaunched()
    })
  }

  const activeAgents = agents ?? []
  const hasNoAgents = !isLoading && activeAgents.length === 0

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Assembler le parcours client"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Assembler le parcours Lab</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choisissez les agents et ordonnez les étapes
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-0 flex-1 min-h-0">
          {/* Colonne gauche — Catalogue agents */}
          <div className="flex-1 p-4 border-r border-border overflow-y-auto">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Agents disponibles
            </h3>

            {isLoading && (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            )}

            {hasNoAgents && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
              >
                Aucun agent disponible. Synchronisez d&apos;abord le catalogue Élio Lab.
              </div>
            )}

            {activeAgents.map(agent => (
              <button
                key={agent.id}
                onClick={() => addAgent(agent)}
                className="w-full flex items-start gap-3 rounded-xl border border-border bg-background p-3 mb-2 text-left hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-colors"
                aria-label={`Ajouter ${agent.name}`}
              >
                {agent.imagePath ? (
                  <img
                    src={agent.imagePath}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                    aria-hidden="true"
                  />
                ) : (
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold"
                    aria-hidden="true"
                  >
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{agent.name}</p>
                  {agent.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{agent.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Colonne droite — Étapes sélectionnées */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Parcours composé ({selectedSteps.length} étape{selectedSteps.length !== 1 ? 's' : ''})
            </h3>

            {selectedSteps.length === 0 && (
              <p className="text-sm text-muted-foreground text-center mt-8">
                Sélectionnez des agents à gauche pour composer le parcours.
              </p>
            )}

            <ol className="space-y-2">
              {selectedSteps.map((step, index) => (
                <li
                  key={`${step.agentId}-${index}`}
                  className="rounded-xl border border-border bg-background p-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-muted-foreground w-5 text-center">
                      {index + 1}
                    </span>
                    <span className="text-xs font-medium text-foreground flex-1 truncate">
                      {step.agentName}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        aria-label="Monter l'étape"
                        className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveDown(index)}
                        disabled={index === selectedSteps.length - 1}
                        aria-label="Descendre l'étape"
                        className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeStep(index)}
                        aria-label={`Supprimer l'étape ${index + 1}`}
                        className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={step.stepLabel}
                    onChange={e => updateLabel(index, e.target.value)}
                    aria-label={`Label de l'étape ${index + 1}`}
                    placeholder={`Étape ${index + 1} — Label`}
                    className="w-full rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border shrink-0 space-y-2">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Annuler
            </Button>
            <Button
              onClick={handleLaunch}
              disabled={isPending || selectedSteps.length === 0 || hasNoAgents}
              aria-label="Lancer le parcours avec les étapes sélectionnées"
            >
              {isPending ? 'Lancement…' : `Lancer (${selectedSteps.length} étape${selectedSteps.length !== 1 ? 's' : ''})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
