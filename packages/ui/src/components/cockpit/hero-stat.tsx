import type { LucideIcon } from 'lucide-react'
import { TrendingUp } from 'lucide-react'
import { cn } from '@monprojetpro/utils'
import { COCKPIT_TONES, type CockpitTone } from './tones'

export interface HeroStatProps {
  icon: LucideIcon
  label: string
  value: string | number
  /** Ton d'accent de la carte. */
  tone?: CockpitTone
  /** Variation positive affichée en pastille verte (ex : +12). */
  trend?: number
  /** Ligne secondaire discrète sous le label. */
  sub?: string
  className?: string
}

/**
 * Carte KPI « héros » — grande carte avec pastille d'icône colorée, gros chiffre,
 * tendance et halo lumineux au survol. Brique centrale des tableaux de bord du Hub.
 */
export function HeroStat({
  icon: Icon,
  label,
  value,
  tone = 'cyan',
  trend,
  sub,
  className,
}: HeroStatProps) {
  const t = COCKPIT_TONES[tone]
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition-all duration-200 hover:bg-white/[0.04]',
        t.hoverBorder,
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-100',
          t.glow,
        )}
      />
      <div className="relative flex items-start justify-between">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl border', t.chip)}>
          <Icon className="h-5 w-5" />
        </div>
        {trend !== undefined && trend > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[0.7rem] font-medium text-emerald-300">
            <TrendingUp className="h-3 w-3" />+{trend.toLocaleString('fr-FR')}
          </span>
        )}
      </div>
      <p className="relative mt-4 text-3xl font-semibold tabular-nums tracking-tight text-white">
        {value}
      </p>
      <p className="relative mt-1 text-sm text-gray-400">{label}</p>
      {sub && <p className="relative mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

/** Grille responsive standard pour les cartes héros (1 / 2 / 4 colonnes). */
export function HeroStatGrid({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {children}
    </div>
  )
}
