import { cn } from '@monprojetpro/utils'
import { COCKPIT_TONES, type CockpitTone } from './tones'

export interface StatCardProps {
  label: string
  value: string | number
  /** Met en avant la carte (bordure + valeur teintées du ton). */
  accent?: boolean
  /** Ton d'accent quand `accent` est actif (cyan par défaut). */
  tone?: CockpitTone
  className?: string
}

/**
 * Mini-carte métrique — libellé + valeur, dans une grille de détail.
 * Version « cockpit » du `MetricCard` : verre sur fond noir, accent optionnel.
 */
export function StatCard({ label, value, accent = false, tone = 'cyan', className }: StatCardProps) {
  const t = COCKPIT_TONES[tone]
  return (
    <div
      className={cn(
        'rounded-xl border bg-white/[0.02] p-4 transition-colors',
        accent ? t.softBorder : 'border-white/10',
        className,
      )}
    >
      <p className="text-[0.7rem] font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-semibold tabular-nums tracking-tight',
          accent ? t.text : 'text-white',
        )}
      >
        {value}
      </p>
    </div>
  )
}
