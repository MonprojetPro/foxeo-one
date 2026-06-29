'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight, type LucideIcon } from 'lucide-react'

/**
 * Brique visuelle des cartes du cockpit One — recréée d'après le langage des cartes Hub
 * (`apps/hub/components/dashboard/*` + `crm/client-cockpit-tab`), PAS importée d'apps/hub
 * (règle d'archi : pas de dépendance app→app). Habillée du thème One vert
 * (`var(--brand-accent, #16a34a)` / `#4ade80`) avec glow subtil au survol.
 *
 * Composition : en-tête (icône colorée + titre) → corps (métriques) → pied (lien d'action).
 * Toutes les couleurs d'icônes sont des classes Tailwind statiques (purgeables).
 */

/** Palette d'accent d'icône — classes statiques (texte + fond translucide), façon registre CRM. */
export type CockpitAccent =
  | 'emerald'
  | 'indigo'
  | 'amber'
  | 'sky'
  | 'violet'
  | 'rose'
  | 'cyan'

const ACCENT_ICON: Record<CockpitAccent, string> = {
  emerald: 'text-emerald-400 bg-emerald-400/10',
  indigo: 'text-indigo-400 bg-indigo-400/10',
  amber: 'text-amber-400 bg-amber-400/10',
  sky: 'text-sky-400 bg-sky-400/10',
  violet: 'text-violet-400 bg-violet-400/10',
  rose: 'text-rose-400 bg-rose-400/10',
  cyan: 'text-cyan-400 bg-cyan-400/10',
}

interface CockpitCardProps {
  title: string
  Icon: LucideIcon
  accent: CockpitAccent
  /** Pied de carte : lien vers le module concerné. Ignoré si `onClick` est fourni. */
  href?: string
  /** Action de pied alternative au lien (ex : ouvrir la pop-up Élio). Prioritaire sur `href`. */
  onClick?: () => void
  /** Libellé du lien de pied (défaut « Voir tout → »). */
  linkLabel?: string
  /** Pastille compteur optionnelle à droite du titre (ex : non-lus, à traiter). */
  badge?: number
  children: ReactNode
}

/**
 * Carte de cockpit One — conteneur thématique avec en-tête, corps et pied cliquable.
 */
export function CockpitCard({
  title,
  Icon,
  accent,
  href,
  onClick,
  linkLabel = 'Voir tout',
  badge,
  children,
}: CockpitCardProps) {
  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border bg-[#141414] p-5 transition-colors hover:border-[color:color-mix(in_srgb,var(--brand-accent,#16a34a)_45%,transparent)]"
      style={{ borderColor: '#262626' }}
    >
      {/* Glow subtil au survol (thème One) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: 'color-mix(in srgb, var(--brand-accent, #16a34a) 16%, transparent)' }}
      />

      {/* En-tête : icône + titre (+ badge) */}
      <div className="relative mb-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ACCENT_ICON[accent]}`}
            aria-hidden="true"
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <h3 className="text-[14px] font-semibold text-[#f3f4f6]">{title}</h3>
        </div>
        {typeof badge === 'number' && badge > 0 && (
          <span
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
            style={{
              background: 'color-mix(in srgb, var(--brand-accent, #16a34a) 22%, transparent)',
              color: 'var(--brand-accent, #4ade80)',
            }}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Corps : métriques */}
      <div className="relative flex-1">{children}</div>

      {/* Pied : action (bouton → pop-up) ou lien vers le module */}
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="relative mt-4 inline-flex items-center gap-1 self-start text-[12.5px] font-medium transition-colors cursor-pointer"
          style={{ color: 'color-mix(in srgb, var(--brand-accent, #4ade80) 82%, white)' }}
        >
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      ) : (
        <Link
          href={href ?? '#'}
          className="relative mt-4 inline-flex items-center gap-1 text-[12.5px] font-medium transition-colors"
          style={{ color: 'color-mix(in srgb, var(--brand-accent, #4ade80) 82%, white)' }}
        >
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  )
}

/** Ligne « libellé → valeur » dans le corps d'une carte. */
export function CockpitMetric({
  label,
  value,
  emphasis = false,
}: {
  label: string
  value: ReactNode
  emphasis?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-[12.5px] text-[#9ca3af]">{label}</span>
      <span
        className={
          emphasis
            ? 'text-[15px] font-bold text-[#f9fafb]'
            : 'text-[13px] font-medium text-[#e5e7eb]'
        }
      >
        {value}
      </span>
    </div>
  )
}

/** Gros chiffre mis en avant (KPI principal d'une carte). */
export function CockpitBigNumber({
  value,
  suffix,
}: {
  value: number | string
  suffix?: string
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[28px] font-bold leading-none text-[#f9fafb]">{value}</span>
      {suffix && <span className="text-[12.5px] text-[#9ca3af]">{suffix}</span>}
    </div>
  )
}

/** État vide discret pour le corps d'une carte. */
export function CockpitEmptyLine({ children }: { children: ReactNode }) {
  return <p className="py-1 text-[12.5px] text-[#6b7280]">{children}</p>
}

/** Skeleton du corps d'une carte (jamais de spinner). */
export function CockpitCardSkeleton() {
  return (
    <div
      className="rounded-2xl border bg-[#141414] p-5"
      style={{ borderColor: '#262626' }}
      aria-hidden="true"
    >
      <div className="mb-4 flex items-center gap-2.5">
        <div className="h-9 w-9 animate-pulse rounded-lg bg-[#1f1f1f]" />
        <div className="h-3.5 w-28 animate-pulse rounded bg-[#1f1f1f]" />
      </div>
      <div className="space-y-2.5">
        <div className="h-7 w-20 animate-pulse rounded bg-[#1f1f1f]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-[#1a1a1a]" />
      </div>
      <div className="mt-5 h-3 w-24 animate-pulse rounded bg-[#1a1a1a]" />
    </div>
  )
}
