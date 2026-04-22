'use client'

import { useState, useTransition } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@monprojetpro/ui'
import { getElioLabAgents } from '@monprojetpro/module-elio'
import { addParcoursStep } from '../actions/add-parcours-step'

interface AddStepModalProps {
  clientId: string
  onClose: () => void
  onAdded: () => void
}

export function AddStepModal({ clientId, onClose, onAdded }: AddStepModalProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [stepLabel, setStepLabel] = useState('')
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

  const selectedAgent = agents?.find(a => a.id === selectedAgentId) ?? null

  function handleSelect(agentId: string, agentName: string) {
    setSelectedAgentId(agentId)
    if (!stepLabel) {
      setStepLabel(`Étape supplémentaire — ${agentName}`)
    }
  }

  function handleAdd() {
    setError(null)
    if (!selectedAgentId) {
      setError('Veuillez sélectionner un agent.')
      return
    }
    if (!stepLabel.trim()) {
      setError('Le label de l\'étape est requis.')
      return
    }
    startTransition(async () => {
      const result = await addParcoursStep({
        clientId,
        agentId: selectedAgentId,
        stepLabel: stepLabel.trim(),
      })
      if (result.error) {
        setError(result.error.message)
        return
      }
      onAdded()
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ajouter une étape au parcours"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Ajouter une étape</h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Sélection agent */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Agent
            </p>
            {isLoading && (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            )}
            {!isLoading && (agents ?? []).length === 0 && (
              <p role="alert" className="text-sm text-destructive">
                Aucun agent disponible. Synchronisez d&apos;abord le catalogue.
              </p>
            )}
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {(agents ?? []).map(agent => (
                <button
                  key={agent.id}
                  onClick={() => handleSelect(agent.id, agent.name)}
                  className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                    selectedAgentId === agent.id
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-border bg-background hover:border-cyan-500/50 hover:bg-cyan-500/5'
                  }`}
                  aria-pressed={selectedAgentId === agent.id}
                  aria-label={`Sélectionner ${agent.name}`}
                >
                  {agent.imagePath ? (
                    <img src={agent.imagePath} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" aria-hidden="true" />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground" aria-hidden="true">
                      {agent.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-foreground">{agent.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Label */}
          {selectedAgentId && (
            <div>
              <label htmlFor="step-label" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-1">
                Label de l&apos;étape
              </label>
              <input
                id="step-label"
                type="text"
                value={stepLabel}
                onChange={e => setStepLabel(e.target.value)}
                placeholder="Ex : Étape supplémentaire — Branding"
                className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Annuler
          </Button>
          <Button
            onClick={handleAdd}
            disabled={isPending || !selectedAgentId || !stepLabel.trim()}
          >
            {isPending ? 'Ajout…' : 'Ajouter'}
          </Button>
        </div>
      </div>
    </div>
  )
}
