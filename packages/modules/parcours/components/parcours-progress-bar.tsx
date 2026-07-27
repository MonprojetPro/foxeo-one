'use client'

import { cn } from '@monprojetpro/utils'

interface ParcoursProgressBarProps {
  completedSteps: number
  totalSteps: number
  progressPercent: number
  className?: string
  /**
   * Abonnement terminé → le parcours ne progresse plus. On GARDE le chiffre (c'est
   * l'historique du client, il a de la valeur) mais on change le cadrage : ce n'est plus
   * une jauge qui va monter, c'est le point où le parcours s'est arrêté.
   */
  frozen?: boolean
}

export function ParcoursProgressBar({
  completedSteps,
  totalSteps,
  progressPercent,
  className,
  frozen = false,
}: ParcoursProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progressPercent || 0))
  return (
    <div className={cn('space-y-2.5', className)}>
      {/* Label row */}
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-[#9ca3af]">
          <span className="text-[#f9fafb] font-medium">
            {frozen ? 'Parcours arrêté' : 'Progression globale'}
          </span>
          <span className="text-[#6b7280] mx-2">—</span>
          <span>
            {frozen
              ? `${completedSteps}/${totalSteps} étapes réalisées`
              : `${completedSteps}/${totalSteps} étapes`}
          </span>
        </div>
        <span
          className={cn(
            'text-[13px] font-semibold tabular-nums',
            frozen ? 'text-[#9ca3af]' : 'text-[#4ade80]'
          )}
        >
          {clamped}%
        </span>
      </div>
      {/* Bar — teinte neutre quand le parcours est arrêté : le dégradé violet « vivant »
          laisserait croire que la jauge va continuer à monter. */}
      <div
        className="h-2 rounded-full bg-[#2d2d2d] overflow-hidden"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={
          frozen
            ? `Parcours arrêté à ${clamped}% — ${completedSteps} étape(s) sur ${totalSteps} réalisée(s)`
            : `${clamped}% du parcours complété`
        }
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-in-out',
            frozen ? 'bg-[#4b5563]' : 'bg-gradient-to-r from-[#7c3aed] to-[#a78bfa]'
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
