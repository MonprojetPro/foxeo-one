'use client'

import { SectionTitle } from '@monprojetpro/ui'
import { KpiCard } from './kpi-card'
import { ClientTypeChart } from './client-type-chart'
import { TimePerClientTable } from './time-per-client-table'
import { StatsSkeleton } from './stats-skeleton'
import { usePortfolioStats, useGraduationRate } from '../hooks/use-portfolio-stats'
import { useTimePerClient } from '../hooks/use-time-per-client'
import type { PortfolioStats, GraduationRate, ClientTimeEstimate } from '../types/crm.types'

interface StatsDashboardProps {
  initialStats?: PortfolioStats
  initialGraduation?: GraduationRate
  initialTimePerClient?: ClientTimeEstimate[]
}

export function StatsDashboard({
  initialStats,
  initialGraduation,
  initialTimePerClient,
}: StatsDashboardProps) {
  const statsQuery = usePortfolioStats(initialStats)
  const graduationQuery = useGraduationRate(initialGraduation)
  const timeQuery = useTimePerClient(initialTimePerClient)

  if (statsQuery.isPending && !initialStats) {
    return <StatsSkeleton />
  }

  const stats = statsQuery.data
  const graduation = graduationQuery.data
  const timeData = timeQuery.data ?? []

  return (
    <div className="space-y-6" data-testid="stats-dashboard">
      {/* Section : indicateurs clés */}
      <SectionTitle>Indicateurs clés</SectionTitle>

      {/* Grille KPI — 5 cartes sur 4 colonnes max */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <KpiCard
          label="Total clients"
          value={stats?.totalClients ?? 0}
          tooltip={`${stats?.byStatus.active ?? 0} actifs, ${stats?.byStatus.archived ?? 0} archivés, ${stats?.byStatus.suspended ?? 0} suspendus`}
        />
        <KpiCard
          label="Clients Lab actifs"
          value={stats?.labActive ?? 0}
          tooltip={`${stats?.labActive ?? 0} clients Lab actifs sur ${stats?.totalClients ?? 0} total`}
        />
        <KpiCard
          label="Clients One actifs"
          value={stats?.oneActive ?? 0}
          tooltip={`${stats?.oneActive ?? 0} clients One actifs sur ${stats?.totalClients ?? 0} total`}
        />
        <KpiCard
          label="Taux graduation"
          value={graduation ? `${graduation.percentage}%` : '—'}
          tooltip={graduation ? `${graduation.graduated} gradués sur ${graduation.totalLabClients} clients Lab` : 'Chargement...'}
        />
        <KpiCard
          label="MRR estimé"
          value={stats?.mrr.available ? `${stats.mrr.amount}€` : '—'}
          tooltip={stats?.mrr.available ? `Revenu mensuel récurrent: ${stats.mrr.amount}€` : (stats?.mrr && !stats.mrr.available ? stats.mrr.message : 'Module Facturation requis')}
        />
      </div>

      {/* Section : répartition par type de client */}
      {stats && (
        <>
          <SectionTitle>Répartition</SectionTitle>
          <ClientTypeChart
            data={stats.byType}
            total={stats.totalClients}
          />
        </>
      )}

      {/* Section : temps passé par client */}
      <SectionTitle>Temps par client</SectionTitle>
      <TimePerClientTable data={timeData} />
    </div>
  )
}
