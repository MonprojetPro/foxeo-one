'use client'

import { useMemo } from 'react'
import { useCatalogAnalytics, type CatalogAnalyticsEntry } from '../hooks/use-catalog-analytics'
import { useUpsertModuleCatalog } from '../hooks/use-module-catalog'

function MetricCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">{title}</h3>
      {children}
    </div>
  )
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + '€'
}

export function CatalogAnalyticsWidgets() {
  const { data: analytics, isLoading } = useCatalogAnalytics()
  const promoteMutation = useUpsertModuleCatalog()

  const { topModules, revenueRanking, kindDistribution, promotionCandidates } = useMemo(() => {
    if (!analytics) return { topModules: [], revenueRanking: [], kindDistribution: { catalog: 0, custom: 0 }, promotionCandidates: [] }

    const topModules = [...analytics]
      .filter(m => m.is_active)
      .sort((a, b) => b.active_clients_count - a.active_clients_count)
      .slice(0, 10)

    const revenueRanking = [...analytics]
      .filter(m => m.is_active)
      .sort((a, b) => b.estimated_yearly_recurring_revenue - a.estimated_yearly_recurring_revenue)
      .slice(0, 10)

    const kindDistribution = analytics
      .filter(m => m.is_active)
      .reduce((acc, m) => {
        acc[m.kind] = (acc[m.kind] || 0) + 1
        return acc
      }, { catalog: 0, custom: 0 } as Record<string, number>)

    const promotionCandidates = analytics.filter(
      m => m.kind === 'custom' && m.active_clients_count >= 3
    )

    return { topModules, revenueRanking, kindDistribution, promotionCandidates }
  }, [analytics])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-lg bg-white/5" />
        ))}
      </div>
    )
  }

  const totalKind = kindDistribution.catalog + kindDistribution.custom
  const catalogPct = totalKind > 0 ? Math.round((kindDistribution.catalog / totalKind) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Analytics Catalogue</h1>
        <p className="text-sm text-gray-400">Vue d'ensemble de l'utilisation des modules</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Widget 1: Top modules par adoption */}
        <MetricCard title="Top modules (par nombre de clients)">
          <div className="space-y-2">
            {topModules.map((mod, i) => (
              <div key={mod.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{i + 1}.</span>
                  <span className="text-sm text-white">{mod.name}</span>
                  {mod.is_default && (
                    <span className="text-xs text-cyan-400">(base)</span>
                  )}
                </div>
                <span className="text-sm font-medium text-white">
                  {mod.active_clients_count} client{mod.active_clients_count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
            {topModules.length === 0 && (
              <p className="text-sm text-gray-500">Aucun module actif</p>
            )}
          </div>
        </MetricCard>

        {/* Widget 2: Revenue cumule */}
        <MetricCard title="Revenue récurrent annuel">
          <div className="space-y-2">
            {revenueRanking.map((mod) => (
              <div key={mod.id} className="flex items-center justify-between">
                <span className="text-sm text-white">{mod.name}</span>
                <span className="text-sm font-medium text-cyan-400">
                  {formatCurrency(mod.estimated_yearly_recurring_revenue)}
                </span>
              </div>
            ))}
            {revenueRanking.length === 0 && (
              <p className="text-sm text-gray-500">Aucun revenu estimé</p>
            )}
          </div>
        </MetricCard>

        {/* Widget 3: Custom vs Catalog */}
        <MetricCard title="Répartition Catalogue vs Sur-mesure">
          <div className="flex items-center gap-4">
            <div className="relative h-24 w-24">
              <svg viewBox="0 0 36 36" className="h-24 w-24">
                <circle
                  cx="18" cy="18" r="15.9"
                  fill="none"
                  stroke="rgba(168, 85, 247, 0.3)"
                  strokeWidth="3"
                />
                <circle
                  cx="18" cy="18" r="15.9"
                  fill="none"
                  stroke="rgb(56, 189, 248)"
                  strokeWidth="3"
                  strokeDasharray={`${catalogPct} ${100 - catalogPct}`}
                  strokeDashoffset="25"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-sky-400" />
                <span className="text-sm text-white">Catalogue : {kindDistribution.catalog}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-purple-400/30" />
                <span className="text-sm text-white">Sur-mesure : {kindDistribution.custom}</span>
              </div>
            </div>
          </div>
        </MetricCard>

        {/* Widget 4: Suggestion de promotion */}
        <MetricCard title="Suggestion de promotion">
          {promotionCandidates.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-2">
                Modules sur-mesure actifs sur 3+ clients — candidats au catalogue
              </p>
              {promotionCandidates.map((mod) => (
                <div key={mod.id} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-white">{mod.name}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      {mod.active_clients_count} clients
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Promouvoir "${mod.name}" en module catalogue ?`)) {
                        promoteMutation.mutate({
                          id: mod.id,
                          module_key: mod.module_key,
                          name: mod.name,
                          category: mod.category,
                          kind: 'catalog',
                          setup_price_ht: mod.setup_price_ht,
                          monthly_price_ht: mod.monthly_price_ht,
                        })
                      }
                    }}
                    disabled={promoteMutation.isPending}
                    className="rounded bg-purple-500/20 px-2 py-1 text-xs text-purple-300 hover:bg-purple-500/30"
                  >
                    Promouvoir
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Aucun module sur-mesure n'est actif sur 3+ clients
            </p>
          )}
        </MetricCard>
      </div>
    </div>
  )
}
