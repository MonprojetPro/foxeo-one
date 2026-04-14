'use client'

import { StatsDashboard, CrmSubNav } from '@monprojetpro/modules-crm'
import type { PortfolioStats, GraduationRate, ClientTimeEstimate } from '@monprojetpro/modules-crm'

interface StatsPageClientProps {
  initialStats?: PortfolioStats
  initialGraduation?: GraduationRate
  initialTimePerClient?: ClientTimeEstimate[]
}

export function StatsPageClient({
  initialStats,
  initialGraduation,
  initialTimePerClient,
}: StatsPageClientProps) {
  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">Statistiques CRM</h1>
        <p className="text-muted-foreground">
          Indicateurs de performance et temps passé par client
        </p>
      </div>

      <CrmSubNav />

      <StatsDashboard
        initialStats={initialStats}
        initialGraduation={initialGraduation}
        initialTimePerClient={initialTimePerClient}
      />
    </div>
  )
}
