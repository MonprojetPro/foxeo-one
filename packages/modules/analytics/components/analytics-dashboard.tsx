'use client'

import { useState } from 'react'
import { useAnalytics } from '../hooks/use-analytics'
import type { AnalyticsPeriod } from '../actions/get-analytics'
import { MetricCard } from './metric-card'
import { BarChart } from './bar-chart'

const PERIODS: { key: AnalyticsPeriod; label: string }[] = [
  { key: '7d', label: '7j' },
  { key: '30d', label: '30j' },
  { key: '90d', label: '90j' },
  { key: '1y', label: '1an' },
]

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-gray-300 mb-3">{children}</h2>
}

function SkeletonCard() {
  return <div className="h-20 rounded-lg bg-white/5 animate-pulse" />
}

function SkeletonBar() {
  return <div className="h-5 rounded bg-white/5 animate-pulse" />
}

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d')
  const { data, isLoading, error } = useAnalytics(period)

  if (error) {
    return (
      <div className="rounded-lg border border-red-400/30 bg-red-400/5 p-6 text-center">
        <p className="text-sm text-red-400">Erreur lors du chargement des analytics</p>
        <p className="text-xs text-gray-500 mt-1">{(error as Error).message ?? 'Erreur inconnue'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Analytics</h1>
          <p className="text-sm text-gray-400">Métriques d&apos;usage de la plateforme</p>
        </div>

        {/* Period filter */}
        <div className="flex gap-1 rounded-lg border border-white/10 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                period === p.key
                  ? 'bg-cyan-400/20 text-cyan-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vue d'ensemble */}
      <div>
        <SectionTitle>Vue d&apos;ensemble</SectionTitle>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="Clients actifs"
              value={data?.overview?.totalClients ?? 0}
              sub={`Lab: ${data?.overview?.labClients ?? 0} · One: ${data?.overview?.oneClients ?? 0}`}
              accent
            />
            <MetricCard
              label="Taux graduation"
              value={`${data?.overview?.graduationRate ?? 0}%`}
              sub="Lab → One"
            />
            <MetricCard
              label="Conversations Élio"
              value={data?.elio?.totalConversations ?? 0}
              sub={`${data?.elio?.conversationsPerDay ?? 0}/jour`}
            />
            <MetricCard
              label="Activités tracées"
              value={data?.overview?.handledRequests ?? 0}
              sub={`Sur ${period}`}
            />
          </div>
        )}
      </div>

      {/* Modules & Élio */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Modules par usage */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <SectionTitle>Modules — classement usage</SectionTitle>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonBar key={i} />)}
            </div>
          ) : (
            <BarChart
              data={(data?.modules ?? []).map((m) => ({
                label: m.entityType,
                value: m.count,
              }))}
            />
          )}
        </div>

        {/* Élio stats */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <SectionTitle>Agent Élio</SectionTitle>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <SkeletonBar key={i} />)}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Conversations totales</span>
                <span className="text-white font-medium">{data?.elio?.totalConversations ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Feedbacks positifs</span>
                <span className="text-green-400 font-medium">{data?.elio?.positiveFeedback ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Feedbacks négatifs</span>
                <span className="text-red-400 font-medium">{data?.elio?.negativeFeedback ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Moyenne/jour</span>
                <span className="text-white font-medium">{data?.elio?.conversationsPerDay ?? 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Engagement & MRR */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Clients les plus actifs */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <SectionTitle>Engagement clients</SectionTitle>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonBar key={i} />)}
            </div>
          ) : (
            <div className="space-y-2">
              {(data?.engagement?.mostActiveClients ?? []).slice(0, 5).map((c, i) => (
                <div key={c.actorId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    <span className="text-gray-500 mr-2">#{i + 1}</span>
                    {c.actorId.slice(0, 8)}…
                  </span>
                  <span className="text-white font-medium">{c.count} actions</span>
                </div>
              ))}
              {data?.engagement?.inactiveClientIds && data.engagement.inactiveClientIds.length > 0 && (
                <p className="text-xs text-amber-400 mt-2">
                  {data.engagement.inactiveClientIds.length} client(s) inactif(s) &gt;7j
                </p>
              )}
            </div>
          )}
        </div>

        {/* MRR */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <SectionTitle>Revenus (MRR)</SectionTitle>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => <SkeletonBar key={i} />)}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">MRR estimé</span>
                <span className="text-white font-medium">
                  {data?.mrr?.mrr != null
                    ? `${data.mrr.mrr.toFixed(2)} €`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Abonnements actifs</span>
                <span className="text-white font-medium">{data?.mrr?.activeSubscriptions ?? 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
