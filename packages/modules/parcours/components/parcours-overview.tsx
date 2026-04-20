'use client'

import { useState } from 'react'
import { useParcours } from '../hooks/use-parcours'
import { ParcoursProgressBar } from './parcours-progress-bar'
import { ParcoursStepCard } from './parcours-step-card'
import { ElioParcoursPanel } from './elio-parcours-panel'
import { AbandonParcoursDialog } from './abandon-parcours-dialog'

interface ParcoursOverviewProps {
  clientId: string
  clientFirstName?: string | null
}

const ABANDONABLE_STATUSES = ['en_cours', 'in_progress', 'not_started', 'suspendu']

export function ParcoursOverview({ clientId, clientFirstName }: ParcoursOverviewProps) {
  const { data: parcours, isPending, error } = useParcours(clientId)
  const [abandonDialogOpen, setAbandonDialogOpen] = useState(false)

  if (isPending) {
    return <ParcoursOverviewSkeleton />
  }

  if (error || !parcours) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
        <p className="text-destructive text-sm">
          Impossible de charger votre parcours. Veuillez réessayer.
        </p>
      </div>
    )
  }

  const isAbandoned = parcours.status === 'abandoned'
  const canAbandon = ABANDONABLE_STATUSES.includes(parcours.status)
  const currentStep = parcours.steps.find((s) => s.status === 'current') ?? null
  const allCompleted = parcours.completedSteps > 0 && parcours.completedSteps === parcours.totalSteps

  return (
    <div className="space-y-6">
      {/* Story 9.3 — Parcours abandonné : message pause */}
      {isAbandoned && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-6 text-center space-y-2">
          <p className="text-sm font-medium text-foreground">Votre parcours est en pause.</p>
          <p className="text-sm text-muted-foreground">MiKL va vous contacter pour en discuter.</p>
        </div>
      )}

      {/* Header — Claude Design : greeting + étape en cours */}
      <div>
        <h1 className="text-[24px] font-bold text-[#f9fafb] tracking-[-0.02em]">
          Bonjour{clientFirstName ? `, ${clientFirstName}` : ''} ! 👋
        </h1>
        <p className="text-[13px] text-[#9ca3af] mt-1.5">
          {currentStep
            ? `Étape en cours : ${currentStep.title}`
            : allCompleted
              ? 'Toutes les étapes sont complètes — graduation proche !'
              : (parcours.description ?? 'Mon Parcours d\'incubation')}
        </p>
      </div>

      {/* Progress bar — Claude Design */}
      <ParcoursProgressBar
        completedSteps={parcours.completedSteps}
        totalSteps={parcours.totalSteps}
        progressPercent={parcours.progressPercent}
      />

      {/* Grille 3 colonnes — design Lovable (remplace la timeline verticale) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {parcours.steps.map((step) => (
          <ParcoursStepCard key={step.id} step={step} />
        ))}
      </div>

      {/* Panel Élio — message contextuel */}
      <ElioParcoursPanel clientFirstName={clientFirstName} currentStep={currentStep} allCompleted={allCompleted} />

      {/* Story 9.3 — Bouton abandon discret en bas de page */}
      {canAbandon && (
        <div className="pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => setAbandonDialogOpen(true)}
            className="text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            Quitter le parcours
          </button>
        </div>
      )}

      {/* Story 9.3 — Dialog abandon */}
      <AbandonParcoursDialog
        clientId={clientId}
        open={abandonDialogOpen}
        onOpenChange={setAbandonDialogOpen}
        completedSteps={parcours.completedSteps}
        totalSteps={parcours.totalSteps}
      />
    </div>
  )
}

function ParcoursOverviewSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-3">
        <div className="h-8 w-64 rounded-md bg-muted" />
        <div className="h-4 w-96 rounded-md bg-muted" />
      </div>

      {/* Progress skeleton */}
      <div className="flex items-center gap-3 max-w-[900px]">
        <div className="h-3 flex-1 rounded-full bg-muted" />
        <div className="h-4 w-28 rounded bg-muted" />
      </div>

      {/* Grid skeleton — mirrors 3-col grid layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-muted" />
        ))}
      </div>

      {/* Élio panel skeleton */}
      <div className="h-36 rounded-xl bg-muted" />
    </div>
  )
}
