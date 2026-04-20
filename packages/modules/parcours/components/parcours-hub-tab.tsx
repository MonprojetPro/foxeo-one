'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@monprojetpro/ui'
import { getParcours } from '../actions/get-parcours'
import { ParcoursStepStatusBadge } from './parcours-step-status-badge'
import { StepElioConfigPanel } from './step-elio-config-panel'
import type { ParcoursStep } from '../types/parcours.types'

interface ParcoursHubTabProps {
  clientId: string
}

export function ParcoursHubTab({ clientId }: ParcoursHubTabProps) {
  const [configuringStep, setConfiguringStep] = useState<ParcoursStep | null>(null)

  const { data: parcours, isLoading, error } = useQuery({
    queryKey: ['parcours', clientId],
    queryFn: async () => {
      const result = await getParcours({ clientId })
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    staleTime: 2 * 60 * 1_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (error || !parcours) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
        Impossible de charger le parcours de ce client.
      </div>
    )
  }

  if (parcours.steps.length === 0) {
    return (
      <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
        Aucune étape trouvée pour ce parcours.
      </div>
    )
  }

  if (configuringStep) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <StepElioConfigPanel
          stepId={configuringStep.id}
          stepTitle={configuringStep.title}
          stepNumber={configuringStep.stepNumber}
          onClose={() => setConfiguringStep(null)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{parcours.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {parcours.completedSteps}/{parcours.totalSteps} étapes complètes · {parcours.progressPercent}%
          </p>
        </div>
        <div className="w-24 h-2 rounded-full bg-muted overflow-hidden" aria-label={`Progression: ${parcours.progressPercent}%`}>
          <div
            className="h-full rounded-full bg-violet-500 transition-all"
            style={{ width: `${parcours.progressPercent}%` }}
          />
        </div>
      </div>

      {parcours.steps.map(step => (
        <div
          key={step.id}
          className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground"
            aria-hidden="true"
          >
            {step.stepNumber}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{step.title}</p>
            <div className="mt-1">
              <ParcoursStepStatusBadge status={step.status} />
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfiguringStep(step)}
            aria-label={`Configurer Élio pour l'étape ${step.stepNumber}: ${step.title}`}
          >
            Configurer Élio
          </Button>
        </div>
      ))}
    </div>
  )
}
