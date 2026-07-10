import type { LucideIcon } from 'lucide-react'
import { cn } from '@monprojetpro/utils'
import { COCKPIT_TONES, type CockpitTone } from './tones'

/**
 * Classe d'un « pill » (onglet arrondi) selon son état actif + le ton d'accent.
 * Exposé pour les navigations par lien (Next `<Link>`) qui ne peuvent pas utiliser
 * le composant contrôlé `PillTabs`.
 */
export function pillClasses(isActive: boolean, tone: CockpitTone = 'cyan'): string {
  const t = COCKPIT_TONES[tone]
  return cn(
    'group inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all duration-200',
    isActive
      ? cn('text-white shadow-[0_0_20px_-6px]', t.chip)
      : 'border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/20 hover:bg-white/5 hover:text-gray-200',
  )
}

export interface CountBadgeProps {
  count: number
  tone?: CockpitTone
}

/** Pastille compteur affichée sur un pill (signalements, messages à traiter…). */
export function CountBadge({ count, tone = 'cyan' }: CountBadgeProps) {
  if (count <= 0) return null
  const t = COCKPIT_TONES[tone]
  return (
    <span
      className={cn(
        'ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[0.7rem] font-semibold tabular-nums ring-1',
        t.badgeBg,
        t.ring,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

export interface PillTab<K extends string = string> {
  key: K
  label: string
  icon?: LucideIcon
  count?: number
  countTone?: CockpitTone
}

export interface PillTabsProps<K extends string = string> {
  tabs: PillTab<K>[]
  active: K
  onChange: (key: K) => void
  tone?: CockpitTone
  className?: string
}

/**
 * Navigation à pills contrôlée (onglets in-page). Pour une navigation par route,
 * utiliser `pillClasses()` sur un `<Link>`.
 */
export function PillTabs<K extends string = string>({
  tabs,
  active,
  onChange,
  tone = 'cyan',
  className,
}: PillTabsProps<K>) {
  const t = COCKPIT_TONES[tone]
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {tabs.map((tab) => {
        const isActive = tab.key === active
        const Icon = tab.icon
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            aria-current={isActive ? 'page' : undefined}
            className={pillClasses(isActive, tone)}
          >
            {Icon && (
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive ? t.text : 'text-gray-500 group-hover:text-gray-300',
                )}
              />
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <CountBadge count={tab.count} tone={tab.countTone ?? tone} />
            )}
          </button>
        )
      })}
    </div>
  )
}
