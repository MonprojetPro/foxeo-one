'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@monprojetpro/utils'
import type { ParcoursStep } from '../types/parcours.types'
import { ParcoursStepStatusBadge } from './parcours-step-status-badge'

interface ParcoursStepCardProps {
  step: ParcoursStep
  className?: string
}

export function ParcoursStepCard({ step, className }: ParcoursStepCardProps) {
  const router = useRouter()
  const isClickable = step.status === 'current' || step.status === 'completed'
  const isLocked = step.status === 'locked'

  function handleClick() {
    if (step.status === 'current' || step.status === 'completed') {
      router.push(`/modules/parcours/steps/${step.stepNumber}`)
    }
  }

  return (
    <div
      className={cn(
        'flex-1 rounded-lg border p-4 transition-all duration-200',
        step.status === 'current' && 'border-purple-500/50 bg-purple-950/20 shadow-sm shadow-purple-500/10',
        step.status === 'completed' && 'border-green-500/20 bg-green-950/10',
        step.status === 'locked' && 'border-border/50 bg-muted/20 opacity-60',
        step.status === 'skipped' && 'border-orange-500/20 bg-orange-950/10',
        isClickable && 'cursor-pointer hover:shadow-md',
        className
      )}
      onClick={handleClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() } : undefined}
      title={isLocked ? (step.stepNumber === 1 ? 'Cette étape sera bientôt disponible' : `Complétez l'étape ${step.stepNumber - 1} avant de continuer`) : undefined}
      aria-label={isLocked ? `Étape ${step.stepNumber} verrouillée` : `Étape ${step.stepNumber}: ${step.title}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cn(
            'font-medium text-sm truncate',
            step.status === 'locked' ? 'text-muted-foreground' : 'text-foreground'
          )}>
            {step.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {step.description}
          </p>
          {step.completedAt && step.status === 'completed' && (
            <p className="text-xs text-green-400/70 mt-2">
              Complétée le {new Date(step.completedAt).toLocaleDateString('fr-FR')}
            </p>
          )}
        </div>
        <ParcoursStepStatusBadge status={step.status} className="shrink-0" />
      </div>
    </div>
  )
}
