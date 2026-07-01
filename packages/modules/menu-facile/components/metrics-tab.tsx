'use client'

import {
  Users,
  UtensilsCrossed,
  Copy,
  Home,
  TrendingUp,
  Trophy,
  RefreshCw,
  ArrowRight,
  Flag,
  Mail,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react'
import { useMenuFacileMetrics } from '../hooks/use-menu-facile-metrics'
import { MetricCard } from './metric-card'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nf(n: number | undefined): string {
  return (n ?? 0).toLocaleString('fr-FR')
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-wider text-gray-500">
      {children}
    </h2>
  )
}

function SkeletonCard() {
  return <div className="h-24 rounded-xl bg-white/5 animate-pulse" />
}

function SkeletonHero() {
  return <div className="h-[7.5rem] rounded-2xl bg-white/5 animate-pulse" />
}

function SkeletonRow() {
  return <div className="h-8 rounded bg-white/5 animate-pulse" />
}

// ---------------------------------------------------------------------------
// KPI héros (grande carte avec icône, chiffre, tendance)
// ---------------------------------------------------------------------------

type Tone = 'cyan' | 'violet' | 'emerald' | 'amber'

const TONE: Record<Tone, { chip: string; glow: string; hover: string }> = {
  cyan: {
    chip: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
    glow: 'bg-cyan-400/10',
    hover: 'hover:border-cyan-400/30',
  },
  violet: {
    chip: 'border-violet-400/20 bg-violet-400/10 text-violet-300',
    glow: 'bg-violet-400/10',
    hover: 'hover:border-violet-400/30',
  },
  emerald: {
    chip: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    glow: 'bg-emerald-400/10',
    hover: 'hover:border-emerald-400/30',
  },
  amber: {
    chip: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    glow: 'bg-amber-400/10',
    hover: 'hover:border-amber-400/30',
  },
}

function HeroStat({
  icon: Icon,
  label,
  value,
  trend,
  sub,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  trend?: number
  sub?: string
  tone: Tone
}) {
  const t = TONE[tone]
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition-all duration-200 ${t.hover} hover:bg-white/[0.04]`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-2xl transition-opacity duration-300 ${t.glow} opacity-60 group-hover:opacity-100`}
      />
      <div className="relative flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${t.chip}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend !== undefined && trend > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[0.7rem] font-medium text-emerald-300">
            <TrendingUp className="h-3 w-3" />+{nf(trend)}
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

// ---------------------------------------------------------------------------
// Onglet Tableau de bord
// ---------------------------------------------------------------------------

export function MetricsTab({ onNavigate }: { onNavigate?: (tab: 'moderation' | 'messages') => void }) {
  const { data, isLoading, error, refetch, isFetching } = useMenuFacileMetrics()

  const reportsPending = data?.moderation.reports_pending ?? 0
  const messagesNew = data?.contact?.new ?? 0
  const hasAlerts = reportsPending > 0 || messagesNew > 0

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-400/5 p-8 text-center">
        <p className="text-sm text-red-400">Impossible de joindre le guichet MenuFacile</p>
        <p className="mt-1 text-xs text-gray-500">{(error as Error).message}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-white/5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Bandeau d'alertes actionnables */}
      {!isLoading &&
        (hasAlerts ? (
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-4">
            <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-amber-300/80">
              À traiter
            </p>
            <div className="flex flex-wrap gap-2">
              {reportsPending > 0 && (
                <button
                  onClick={() => onNavigate?.('moderation')}
                  className="flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100 transition-colors hover:bg-amber-400/20"
                >
                  <Flag className="h-4 w-4" />
                  <span className="font-semibold">{reportsPending}</span>
                  signalement{reportsPending > 1 ? 's' : ''} en attente
                  <ArrowRight className="h-3.5 w-3.5 text-amber-300/70" />
                </button>
              )}
              {messagesNew > 0 && (
                <button
                  onClick={() => onNavigate?.('messages')}
                  className="flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100 transition-colors hover:bg-cyan-400/20"
                >
                  <Mail className="h-4 w-4" />
                  <span className="font-semibold">{messagesNew}</span>
                  message{messagesNew > 1 ? 's' : ''} à traiter
                  <ArrowRight className="h-3.5 w-3.5 text-cyan-300/70" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] px-4 py-3 text-sm text-emerald-300/90">
            <CheckCircle2 className="h-4 w-4" />
            Rien à traiter — aucun signalement ni message en attente.
          </div>
        ))}

      {/* Barre méta */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {data?.generated_at
            ? `Mis à jour le ${new Date(data.generated_at).toLocaleString('fr-FR')}`
            : 'Métriques en temps réel du produit MenuFacile'}
        </p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-white/5 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Actualisation…' : 'Actualiser'}
        </button>
      </div>

      {/* KPI héros */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <SkeletonHero />
            <SkeletonHero />
            <SkeletonHero />
            <SkeletonHero />
          </>
        ) : (
          <>
            <HeroStat
              icon={Users}
              tone="cyan"
              label="Utilisateurs"
              value={nf(data?.users.total)}
              trend={data?.users.new_7d}
              sub={`${nf(data?.users.banned)} banni${(data?.users.banned ?? 0) > 1 ? 's' : ''}`}
            />
            <HeroStat
              icon={UtensilsCrossed}
              tone="violet"
              label="Recettes"
              value={nf(data?.recipes.total)}
              trend={data?.recipes.new_7d}
              sub={`${nf(data?.recipes.official)} officielle${(data?.recipes.official ?? 0) > 1 ? 's' : ''}`}
            />
            <HeroStat
              icon={Copy}
              tone="emerald"
              label="Copies de recettes"
              value={nf(data?.recipes.total_copies)}
              sub="engagement cumulé"
            />
            <HeroStat
              icon={Home}
              tone="amber"
              label="Foyers"
              value={nf(data?.households.total)}
              sub={`${nf(data?.households.members)} membre${(data?.households.members ?? 0) > 1 ? 's' : ''}`}
            />
          </>
        )}
      </div>

      {/* Détail recettes */}
      <section>
        <SectionTitle>Détail recettes</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <MetricCard label="Total" value={nf(data?.recipes.total)} accent />
              <MetricCard label="Publiques" value={nf(data?.recipes.public)} />
              <MetricCard label="Officielles" value={nf(data?.recipes.official)} />
              <MetricCard label="Masquées" value={nf(data?.recipes.hidden)} />
              <MetricCard label="Nouvelles (7j)" value={nf(data?.recipes.new_7d)} />
            </>
          )}
        </div>
      </section>

      {/* Communauté */}
      <section>
        <SectionTitle>Communauté &amp; social</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <MetricCard label="Foyers" value={nf(data?.households.total)} />
              <MetricCard label="Foyers officiels" value={nf(data?.households.official)} />
              <MetricCard label="Membres" value={nf(data?.households.members)} />
              <MetricCard label="Notes" value={nf(data?.ratings.total)} />
              <MetricCard label="Amitiés" value={nf(data?.friendships.total)} />
            </>
          )}
        </div>
      </section>

      {/* Modération & support */}
      <section>
        <SectionTitle>Modération &amp; support</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <MetricCard
                label="Signalements en attente"
                value={nf(data?.moderation.reports_pending)}
                accent={(data?.moderation.reports_pending ?? 0) > 0}
              />
              <MetricCard label="Signalements (total)" value={nf(data?.moderation.reports_total)} />
              <MetricCard
                label="Messages à traiter"
                value={nf(data?.contact?.new)}
                accent={(data?.contact?.new ?? 0) > 0}
              />
              <MetricCard label="Messages (total)" value={nf(data?.contact?.total)} />
            </>
          )}
        </div>
      </section>

      {/* Top recettes */}
      <section>
        <SectionTitle>Top recettes (par copies)</SectionTitle>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-gray-400">
                <th className="px-4 py-2.5 font-medium">Recette</th>
                <th className="px-4 py-2.5 text-right font-medium">Copies</th>
                <th className="px-4 py-2.5 text-right font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-3">
                    <SkeletonRow />
                  </td>
                </tr>
              ) : !data?.top_recipes?.length ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-xs text-gray-500">
                    Aucune recette pour l&apos;instant.
                  </td>
                </tr>
              ) : (
                data.top_recipes.map((r, i) => (
                  <tr
                    key={r.id}
                    className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3 text-white">
                      <span className="inline-flex items-center gap-2">
                        {i < 3 ? (
                          <Trophy
                            className={`h-4 w-4 shrink-0 ${
                              i === 0
                                ? 'text-amber-300'
                                : i === 1
                                  ? 'text-gray-300'
                                  : 'text-amber-600'
                            }`}
                          />
                        ) : (
                          <span className="inline-block w-4 shrink-0 text-center text-xs text-gray-600">
                            {i + 1}
                          </span>
                        )}
                        {r.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-300">{nf(r.copy_count)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-300">{nf(r.rating_count)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
