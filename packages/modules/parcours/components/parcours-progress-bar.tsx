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
    <div className={cn('space-y-2.5', className)}>
      {/* Label row */}
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-[#9ca3af]">
          <span className="text-[#f9fafb] font-medium">Progression globale</span>
          <span className="text-[#6b7280] mx-2">—</span>
          <span>{completedSteps}/{totalSteps} étapes</span>
        </div>
        <span className="text-[13px] text-[#4ade80] font-semibold tabular-nums">{clamped}%</span>
      </div>
      {/* Bar */}
      <div
        className="h-2 rounded-full bg-[#2d2d2d] overflow-hidden"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${clamped}% du parcours complété`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] transition-all duration-500 ease-in-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
