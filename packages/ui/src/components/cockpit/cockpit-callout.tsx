import type { LucideIcon } from 'lucide-react'
import { cn } from '@monprojetpro/utils'
import { COCKPIT_TONES, type CockpitTone } from './tones'

export interface CockpitCalloutProps {
  /** Ton du bandeau (amber = à traiter, emerald = RAS, red = erreur…). */
  tone?: CockpitTone
  icon?: LucideIcon
  /** Titre optionnel en petites majuscules. */
  title?: string
  children: React.ReactNode
  className?: string
}

/**
 * Bandeau d'information « cockpit » — fond + bordure teintés, icône optionnelle.
 * Sert aux zones « à traiter », « rien à signaler », messages d'erreur, etc.
 */
export function CockpitCallout({
  tone = 'amber',
  icon: Icon,
  title,
  children,
  className,
}: CockpitCalloutProps) {
  const t = COCKPIT_TONES[tone]
  return (
    <div className={cn('rounded-2xl border p-4', t.softBorder, t.softBg, className)}>
      {title && (
        <p className={cn('mb-2 text-[0.7rem] font-semibold uppercase tracking-wider', t.text)}>
          {title}
        </p>
      )}
      <div className={cn('flex items-center gap-2 text-sm', t.text)}>
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
