'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@monprojetpro/utils'
import type { ParcoursStepStatus } from '../types/parcours.types'

interface AdjacentStep {
  stepNumber: number
  status: ParcoursStepStatus
}

interface StepNavigationButtonsProps {
  currentStepNumber: number
  totalSteps: number
  prevStep?: AdjacentStep | null
  nextStep?: AdjacentStep | null
  className?: string
}

export function StepNavigationButtons({
  currentStepNumber,
  totalSteps,
  prevStep,
  nextStep,
  className,
}: StepNavigationButtonsProps) {
  const hasPrev = currentStepNumber > 1
  const hasNext = currentStepNumber < totalSteps
  const prevDisabled = !hasPrev || prevStep?.status === 'locked'
  const nextDisabled = !hasNext || nextStep?.status === 'locked'

  return (
    <div className={cn('flex items-center justify-between pt-4 border-t border-border', className)}>
      {hasPrev && !prevDisabled ? (
        <Link
          href={`/modules/parcours/steps/${currentStepNumber - 1}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          Étape précédente
        </Link>
      ) : (
        <span
          className="flex items-center gap-1 text-sm text-muted-foreground/40 cursor-not-allowed"
          aria-disabled="true"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          Étape précédente
        </span>
      )}

      {hasNext && !nextDisabled ? (
        <Link
          href={`/modules/parcours/steps/${currentStepNumber + 1}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Étape suivante
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      ) : (
        <span
          className="flex items-center gap-1 text-sm text-muted-foreground/40 cursor-not-allowed"
          aria-disabled="true"
        >
          Étape suivante
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </span>
      )}
    </div>
  )
}
