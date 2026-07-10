import type { LucideIcon } from 'lucide-react'
import { cn } from '@monprojetpro/utils'
import { COCKPIT_TONES, type CockpitTone } from './tones'

export interface CockpitHeaderProps {
  /** Icône principale affichée dans la pastille. */
  icon: LucideIcon
  /** Titre du cockpit (module / page). */
  title: string
  /** Sous-titre descriptif optionnel. */
  subtitle?: string
  /** Ton d'accent (cyan par défaut — thème Hub). */
  tone?: CockpitTone
  /** Slot droit : pastille de statut, badge « à traiter »… */
  status?: React.ReactNode
  /** Slot d'actions (boutons) affiché à droite, sous le statut. */
  actions?: React.ReactNode
  className?: string
}

/**
 * En-tête « cockpit » partagé — bandeau arrondi avec dégradé discret, halo lumineux,
 * pastille d'icône et titre/sous-titre. Signature visuelle du Hub (issue de MenuFacile).
 */
export function CockpitHeader({
  icon: Icon,
  title,
  subtitle,
  tone = 'cyan',
  status,
  actions,
  className,
}: CockpitHeaderProps) {
  const t = COCKPIT_TONES[tone]

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b to-transparent px-5 py-5 sm:px-6',
        t.softBg,
        className,
      )}
    >
      {/* Halo décoratif */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full blur-3xl',
          t.glow,
        )}
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-[0_0_24px_-8px]',
              t.chip,
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-white">{title}</h1>
            {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
          </div>
        </div>

        {(status || actions) && (
          <div className="flex flex-wrap items-center gap-2 sm:pt-1">
            {actions}
            {status}
          </div>
        )}
      </div>
    </div>
  )
}
