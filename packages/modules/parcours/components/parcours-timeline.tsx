'use client'

import { cn } from '@monprojetpro/utils'
import type { ParcoursStep, ParcoursStepStatus } from '../types/parcours.types'
import { ParcoursStepCard } from './parcours-step-card'

function StepIndicator({ step }: { step: ParcoursStep }) {
  const baseClass = 'relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 border-background shrink-0'

  if (step.status === 'completed') {
    return (
      <div className={cn(baseClass, 'bg-green-500 text-white')}>
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
    )
  }

  if (step.status === 'locked') {
    return (
      <div className={cn(baseClass, 'bg-muted text-muted-foreground')}>
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
    )
  }

  if (step.status === 'skipped') {
    return (
      <div className={cn(baseClass, 'bg-orange-500 text-white')}>
        <span className="text-lg font-bold">{step.stepNumber}</span>
      </div>
    )
  }

  // current
  return (
    <div className={cn(baseClass, 'bg-purple-600 text-white shadow-lg shadow-purple-500/20')}>
      <span className="text-lg font-bold">{step.stepNumber}</span>
    </div>
  )
}

interface ParcoursTimelineProps {
  steps: ParcoursStep[]
  className?: string
}

export function ParcoursTimeline({ steps, className }: ParcoursTimelineProps) {
  if (steps.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">
        Aucune étape définie pour ce parcours.
      </p>
    )
  }

  return (
    <div className={cn('relative', className)}>
      {/* Ligne verticale */}
      <div className="absolute left-8 top-8 bottom-8 w-px bg-border" aria-hidden="true" />

      <div className="space-y-8">
        {steps.map((step) => (
          <div key={step.id} className="relative flex items-start gap-4">
            <StepIndicator step={step} />
            <ParcoursStepCard step={step} />
          </div>
        ))}
      </div>
    </div>
  )
}
