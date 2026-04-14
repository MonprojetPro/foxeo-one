'use client'

import { cn } from '@monprojetpro/utils'

interface ParcoursProgressBarProps {
  completedSteps: number
  totalSteps: number
  progressPercent: number
  className?: string
}

export function ParcoursProgressBar({
  completedSteps,
  totalSteps,
  progressPercent,
  className,
}: ParcoursProgressBarProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Progression</span>
        <span className="font-medium text-foreground">
          {completedSteps}/{totalSteps} étapes · {progressPercent}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-purple-600 transition-all duration-500 ease-in-out"
          style={{ width: `${progressPercent}%` }}
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${progressPercent}% du parcours complété`}
        />
      </div>
    </div>
  )
}
