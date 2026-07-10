'use client'

import { useState } from 'react'
import {
  BarChart2,
  Users,
  GraduationCap,
  MessageSquare,
  Activity,
  TrendingUp,
  Banknote,
  Bot,
  AlertCircle,
} from 'lucide-react'
import {
  CockpitHeader,
  CockpitPanel,
  CockpitCallout,
  HeroStat,
  HeroStatGrid,
  HeroStatSkeleton,
  SectionTitle,
  RowSkeleton,
  PillTabs,
  type PillTab,
} from '@monprojetpro/ui'
import { useAnalytics } from '../hooks/use-analytics'
import type { AnalyticsPeriod } from '../actions/get-analytics'
import { MetricCard } from './metric-card'
import { BarChart } from './bar-chart'

/* ─────────────────────────────────────────────────────────────
   Onglets de période — format PillTabs
───────────────────────────────────────────────────────────── */

type Period = { key: AnalyticsPeriod; label: string }

const PERIODS: Period[] = [
  { key: '7d', label: '7 jours' },
  { key: '30d', label: '30 jours' },
  { key: '90d', label: '90 jours' },
  { key: '1y', label: '1 an' },
]

const PERIOD_TABS: PillTab<AnalyticsPeriod>[] = PERIODS.map((p) => ({
  key: p.key,
  label: p.label,
}))

/* ─────────────────────────────────────────────────────────────
   Squelettes de chargement
───────────────────────────────────────────────────────────── */

function HeroSkeletonGrid() {
  return (
    <HeroStatGrid>
      {Array.from({ length: 4 }).map((_, i) => (
        <HeroStatSkeleton key={i} />
      ))}
    </HeroStatGrid>
  )
}

function PanelRowSkeletons({ count }: { count: number }) {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: count }).map((_, i) => (
        <RowSkeleton key={i} />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Ligne de données Élio (stat en ligne)
───────────────────────────────────────────────────────────── */

function ElioRow({
  label,
  value,
  accent,
}: {
  label: string
  value: React.ReactNode
  accent?: 'emerald' | 'red'
}) {
  const valueClass =
    accent === 'emerald'
      ? 'text-emerald-400'
      : accent === 'red'
        ? 'text-red-400'
        : 'text-white'
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/[0.03] transition-colors">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Composant principal
───────────────────────────────────────────────────────────── */

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d')
  const { data, isLoading, error } = useAnalytics(period)

  /* ── État d'erreur ── */
  if (error) {
    return (
      <div className="space-y-6">
        <CockpitHeader
          icon={BarChart2}
          title="Analytics"
          subtitle="Métriques d'usage de la plateforme"
          tone="cyan"
        />
        <CockpitCallout tone="red" icon={AlertCircle} title="Erreur de chargement">
          <span>{(error as Error).message ?? 'Erreur inconnue'}</span>
        </CockpitCallout>
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* ── En-tête cockpit + filtre période ── */}
      <CockpitHeader
        icon={BarChart2}
        title="Analytics"
        subtitle="Métriques d'usage de la plateforme"
        tone="cyan"
        actions={
          <PillTabs
            tabs={PERIOD_TABS}
            active={period}
            onChange={setPeriod}
            tone="cyan"
          />
        }
      />

      {/* ── KPI héros ── */}
      <section aria-label="Vue d'ensemble">
        <SectionTitle>Vue d&apos;ensemble</SectionTitle>
        {isLoading ? (
          <HeroSkeletonGrid />
        ) : (
          <HeroStatGrid>
            <HeroStat
              icon={Users}
              label="Clients actifs"
              value={data?.overview?.totalClients ?? 0}
              tone="cyan"
              sub={`Lab : ${data?.overview?.labClients ?? 0} · One : ${data?.overview?.oneClients ?? 0}`}
            />
            <HeroStat
              icon={GraduationCap}
              label="Taux graduation"
              value={`${data?.overview?.graduationRate ?? 0} %`}
              tone="emerald"
              sub="Lab → One"
            />
            <HeroStat
              icon={MessageSquare}
              label="Conversations Élio"
              value={data?.elio?.totalConversations ?? 0}
              tone="violet"
              sub={`${data?.elio?.conversationsPerDay ?? 0} / jour`}
            />
            <HeroStat
              icon={Activity}
              label="Activités tracées"
              value={data?.overview?.handledRequests ?? 0}
              tone="cyan"
              sub={`Sur ${period}`}
            />
          </HeroStatGrid>
        )}
      </section>

      {/* ── Modules & Élio ── */}
      <section aria-label="Modules et agent Élio">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* Classement modules */}
          <CockpitPanel title="Modules — classement usage">
            {isLoading ? (
              <PanelRowSkeletons count={5} />
            ) : (
              <div className="p-3">
                <BarChart
                  data={(data?.modules ?? []).map((m) => ({
                    label: m.entityType,
                    value: m.count,
                  }))}
                />
              </div>
            )}
          </CockpitPanel>

          {/* Stats Élio */}
          <CockpitPanel title="Agent Élio" badge={data?.elio?.totalConversations} badgeTone="violet">
            {isLoading ? (
              <PanelRowSkeletons count={4} />
            ) : (
              <div className="py-1">
                <ElioRow
                  label="Conversations totales"
                  value={data?.elio?.totalConversations ?? 0}
                />
                <ElioRow
                  label="Feedbacks positifs"
                  value={data?.elio?.positiveFeedback ?? 0}
                  accent="emerald"
                />
                <ElioRow
                  label="Feedbacks négatifs"
                  value={data?.elio?.negativeFeedback ?? 0}
                  accent="red"
                />
                <ElioRow
                  label="Moyenne / jour"
                  value={data?.elio?.conversationsPerDay ?? 0}
                />
              </div>
            )}
          </CockpitPanel>

        </div>
      </section>

      {/* ── Engagement & MRR ── */}
      <section aria-label="Engagement clients et revenus">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* Clients les plus actifs */}
          <CockpitPanel title="Engagement clients">
            {isLoading ? (
              <PanelRowSkeletons count={5} />
            ) : (
              <div className="py-1">
                {(data?.engagement?.mostActiveClients ?? []).length === 0 ? (
                  /* État vide */
                  <div className="flex items-center justify-center rounded-xl border border-dashed border-white/10 py-6 mx-3 my-2">
                    <p className="text-xs text-gray-500">Aucune activité sur la période</p>
                  </div>
                ) : (
                  <>
                    {(data?.engagement?.mostActiveClients ?? []).slice(0, 5).map((c, i) => (
                      <div
                        key={c.actorId}
                        className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/[0.03] transition-colors"
                      >
                        <span className="text-sm text-gray-400">
                          <span className="text-gray-600 mr-2 tabular-nums">#{i + 1}</span>
                          {c.actorId.slice(0, 8)}…
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-white">
                          {c.count} actions
                        </span>
                      </div>
                    ))}
                    {(data?.engagement?.inactiveClientIds?.length ?? 0) > 0 && (
                      <div className="mx-3 mt-2">
                        <CockpitCallout tone="amber">
                          {data!.engagement!.inactiveClientIds!.length} client(s) inactif(s) depuis plus de 7 jours
                        </CockpitCallout>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </CockpitPanel>

          {/* MRR */}
          <CockpitPanel title="Revenus (MRR)">
            {isLoading ? (
              <PanelRowSkeletons count={2} />
            ) : (
              <div className="grid grid-cols-2 gap-3 p-3">
                <MetricCard
                  label="MRR estimé"
                  value={
                    data?.mrr?.mrr != null
                      ? `${data.mrr.mrr.toFixed(2)} €`
                      : '—'
                  }
                  accent
                />
                <MetricCard
                  label="Abonnements actifs"
                  value={data?.mrr?.activeSubscriptions ?? 0}
                />
              </div>
            )}
          </CockpitPanel>

        </div>
      </section>

    </div>
  )
}
