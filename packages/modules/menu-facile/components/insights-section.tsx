'use client'

import { PieChart, TrendingDown, Info } from 'lucide-react'
import { useHouseholdsDistribution, useRetentionCohorts } from '../hooks/use-insights'
import { num } from '../utils/format'
import type { RetentionCohort } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">
      {children}
    </h2>
  )
}

/**
 * Affiché quand le guichet ne fournit pas encore la vue. On l'écrit noir sur
 * blanc plutôt que de masquer la section : une section qui disparaît sans
 * explication ressemble à un bug.
 */
function NotAvailable({ what }: { what: string }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-gray-500">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{what} — le guichet MenuFacile n’expose pas encore cette donnée.</span>
    </div>
  )
}

function SkeletonBlock({ h = '9rem' }: { h?: string }) {
  return <div className="animate-pulse rounded-2xl bg-white/5" style={{ height: h }} />
}

/** Libellé lisible d'un mois `YYYY-MM`. */
function cohortLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m) return ym
  const d = new Date(Date.UTC(y, m - 1, 1))
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit', timeZone: 'UTC' })
}

/**
 * Couleur d'une cellule de rétention. Un dégradé continu serait joli mais
 * illisible : 4 paliers se lisent d'un coup d'œil.
 */
function retentionCell(pct: number): string {
  if (pct >= 75) return 'bg-emerald-400/25 text-emerald-100'
  if (pct >= 50) return 'bg-emerald-400/15 text-emerald-200/90'
  if (pct >= 25) return 'bg-amber-400/15 text-amber-200/90'
  return 'bg-red-400/10 text-red-200/80'
}

// ---------------------------------------------------------------------------
// Répartition des foyers par taille
// ---------------------------------------------------------------------------

const SIZE_LABEL: Record<string, string> = {
  '1': 'Une personne',
  '2': 'Deux personnes',
  '3-4': '3 à 4 personnes',
  '5+': '5 personnes et plus',
}

function DistributionCard() {
  const { data, isLoading, error } = useHouseholdsDistribution()

  if (isLoading) return <SkeletonBlock h="11rem" />
  if (error || !data) return <NotAvailable what="Répartition des foyers par taille" />

  const buckets = data.buckets ?? []
  const totalHouseholds = buckets.reduce((s, b) => s + (b.households ?? 0), 0)

  if (totalHouseholds === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-xs text-gray-500">
        Aucun foyer à répartir pour l’instant.
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      {buckets.map((b) => {
        const pct = Math.round(((b.households ?? 0) / totalHouseholds) * 100)
        return (
          <div key={b.size} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="text-gray-300">{SIZE_LABEL[b.size] ?? `${b.size} personnes`}</span>
              <span className="tabular-nums text-gray-400">
                {num(b.households)} <span className="text-gray-600">·</span> {pct}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400/70 to-cyan-400/40 transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
      <p className="pt-1 text-[0.7rem] text-gray-600">
        {num(totalHouseholds)} foyer{totalHouseholds > 1 ? 's' : ''} répartis
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cohortes de rétention
// ---------------------------------------------------------------------------

function CohortRow({ c, maxOffset }: { c: RetentionCohort; maxOffset: number }) {
  const byOffset = new Map((c.retained ?? []).map((p) => [p.month_offset, p.active]))

  return (
    <tr className="border-b border-white/5 last:border-0">
      <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-300">
        {cohortLabel(c.cohort)}
      </th>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-400">
        {num(c.signups)}
      </td>
      {Array.from({ length: maxOffset + 1 }, (_, i) => {
        const active = byOffset.get(i)
        // Cellule vide = ce mois n'est pas encore arrivé pour cette cohorte.
        if (active === undefined) {
          return <td key={i} className="px-1.5 py-2" />
        }
        const pct = c.signups > 0 ? Math.round((active / c.signups) * 100) : 0
        return (
          <td key={i} className="px-1 py-1.5">
            <div
              title={`${num(active)} actif(s) sur ${num(c.signups)}`}
              className={`rounded-md px-2 py-1.5 text-center text-xs tabular-nums ${retentionCell(pct)}`}
            >
              {pct}%
            </div>
          </td>
        )
      })}
    </tr>
  )
}

function CohortsCard() {
  const { data, isLoading, error } = useRetentionCohorts()

  if (isLoading) return <SkeletonBlock h="14rem" />
  if (error || !data) return <NotAvailable what="Cohortes de rétention" />

  const cohorts = data.cohorts ?? []
  if (cohorts.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-xs text-gray-500">
        Pas encore assez d’historique pour calculer des cohortes.
      </div>
    )
  }

  const maxOffset = Math.max(
    0,
    ...cohorts.flatMap((c) => (c.retained ?? []).map((p) => p.month_offset)),
  )
  const unitLabel = data.unit === 'user' ? 'utilisateurs' : 'foyers'

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-gray-400">
                <th scope="col" className="px-3 py-2.5 text-left font-medium">
                  Inscrits en
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Nombre
                </th>
                {Array.from({ length: maxOffset + 1 }, (_, i) => (
                  <th key={i} scope="col" className="px-2 py-2.5 text-center font-medium">
                    M+{i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c) => (
                <CohortRow key={c.cohort} c={c} maxOffset={maxOffset} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[0.7rem] text-gray-500">
        Chaque ligne suit les {unitLabel} inscrits ce mois-là. « M+2 » = la part encore
        active deux mois plus tard (au moins une action dans le mois). M+0 vaut toujours
        100 % : c’est le mois de l’inscription.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bloc « Vues d'ensemble » du Tableau de bord
// ---------------------------------------------------------------------------

export function InsightsSection() {
  return (
    <div className="space-y-8">
      <section>
        <SectionTitle>
          <span className="inline-flex items-center gap-1.5">
            <PieChart className="h-3.5 w-3.5 text-cyan-400/70" />
            Qui sont tes foyers
          </span>
        </SectionTitle>
        <DistributionCard />
      </section>

      <section>
        <SectionTitle>
          <span className="inline-flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-cyan-400/70" />
            Rétention par cohorte
          </span>
        </SectionTitle>
        <CohortsCard />
      </section>
    </div>
  )
}
