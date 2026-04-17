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
  const clamped = Math.min(100, Math.max(0, progressPercent || 0))
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="h-3 flex-1 rounded-full bg-[#1e1e1e] border border-[#2d2d2d] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#7c3aed] shadow-[0_0_8px_rgba(124,58,237,0.5)] transition-all duration-500 ease-in-out"
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${clamped}% du parcours complété`}
        />
      </div>
      <span className="text-xs text-[#a78bfa] font-medium whitespace-nowrap">
        {clamped}% complété · {completedSteps}/{totalSteps}
      </span>
    </div>
  )
}
