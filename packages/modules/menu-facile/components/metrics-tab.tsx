'use client'

import { useMenuFacileMetrics } from '../hooks/use-menu-facile-metrics'
import { MetricCard } from './metric-card'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-gray-300 mb-3">{children}</h2>
}

function SkeletonCard() {
  return <div className="h-20 rounded-lg bg-white/5 animate-pulse" />
}

function SkeletonRow() {
  return <div className="h-8 rounded bg-white/5 animate-pulse" />
}

function nf(n: number | undefined): string {
  return (n ?? 0).toLocaleString('fr-FR')
}

export function MetricsTab() {
  const { data, isLoading, error, refetch, isFetching } = useMenuFacileMetrics()

  if (error) {
    return (
      <div className="rounded-lg border border-red-400/30 bg-red-400/5 p-6 text-center">
        <p className="text-sm text-red-400">Impossible de joindre le guichet MenuFacile</p>
        <p className="text-xs text-gray-500 mt-1">{(error as Error).message}</p>
        <button
          onClick={() => refetch()}
          className="mt-3 rounded-md border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {data?.generated_at
            ? `Mis à jour le ${new Date(data.generated_at).toLocaleString('fr-FR')}`
            : 'Métriques en temps réel du produit MenuFacile'}
        </p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 disabled:opacity-50"
        >
          {isFetching ? 'Actualisation…' : 'Actualiser'}
        </button>
      </div>

      {/* Utilisateurs */}
      <section>
        <SectionTitle>Utilisateurs</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <MetricCard label="Total" value={nf(data?.users.total)} accent />
              <MetricCard label="Nouveaux (7j)" value={nf(data?.users.new_7d)} />
              <MetricCard label="Bannis" value={nf(data?.users.banned)} />
            </>
          )}
        </div>
      </section>

      {/* Recettes */}
      <section>
        <SectionTitle>Recettes</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {isLoading ? (
            <>
              <SkeletonCard />
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
              <MetricCard label="Copies totales" value={nf(data?.recipes.total_copies)} />
            </>
          )}
        </div>
      </section>

      {/* Foyers + Social */}
      <section>
        <SectionTitle>Foyers &amp; social</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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

      {/* Modération (rappel) */}
      <section>
        <SectionTitle>Modération</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {isLoading ? (
            <>
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
            </>
          )}
        </div>
      </section>

      {/* Top recettes */}
      <section>
        <SectionTitle>Top recettes (par copies)</SectionTitle>
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-gray-400">
                <th className="px-4 py-2 font-medium">Recette</th>
                <th className="px-4 py-2 font-medium text-right">Copies</th>
                <th className="px-4 py-2 font-medium text-right">Notes</th>
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
                  <td colSpan={3} className="px-4 py-6 text-center text-xs text-gray-500">
                    Aucune recette pour l&apos;instant.
                  </td>
                </tr>
              ) : (
                data.top_recipes.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-2.5 text-white">{r.name}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{nf(r.copy_count)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-300">{nf(r.rating_count)}</td>
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
