import Link from 'next/link'
import { cn } from '@monprojetpro/utils'
import { COCKPIT_TONES, type CockpitTone } from './tones'

export interface CockpitPanelProps {
  title: string
  /** Compteur affiché en pastille à côté du titre. */
  badge?: number
  badgeTone?: CockpitTone
  /** Lien « voir tout » optionnel en haut à droite. */
  linkHref?: string
  linkText?: string
  children: React.ReactNode
  className?: string
}

/**
 * Panneau « cockpit » — conteneur titré avec en-tête (titre + badge + lien) et corps.
 * Version modernisée du `DashboardCard` : verre sur fond noir, bordures fines.
 */
export function CockpitPanel({
  title,
  badge,
  badgeTone = 'cyan',
  linkHref,
  linkText = 'Voir tout →',
  children,
  className,
}: CockpitPanelProps) {
  const t = COCKPIT_TONES[badgeTone]
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[0.8rem] font-semibold uppercase tracking-wider text-gray-300">
            {title}
          </h3>
          {badge !== undefined && badge > 0 && (
            <span
              className={cn(
                'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[0.7rem] font-semibold tabular-nums ring-1',
                t.badgeBg,
                t.ring,
              )}
            >
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>
        {linkHref && (
          <Link
            href={linkHref}
            className="text-xs text-cyan-300/80 transition-colors hover:text-cyan-200"
          >
            {linkText}
          </Link>
        )}
      </div>
      <div className="p-1.5">{children}</div>
    </div>
  )
}
