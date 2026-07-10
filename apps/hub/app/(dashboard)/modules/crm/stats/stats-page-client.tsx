'use client'

import { BarChart3 } from 'lucide-react'
import { CockpitHeader } from '@monprojetpro/ui'
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
    /* Wrapper cockpit — espacement vertical + padding responsive */
    <div className="space-y-6 p-6 md:p-8">
      {/* En-tête cockpit : icône graphe + titre + sous-titre, accent cyan Hub */}
      <CockpitHeader
        icon={BarChart3}
        title="Statistiques CRM"
        subtitle="Indicateurs de performance et temps passé par client"
        tone="cyan"
      />

      {/* Sous-navigation CRM (onglets Clients / Stats / …) */}
      <CrmSubNav />

      {/* Tableau de bord stats — logique métier inchangée */}
      <StatsDashboard
        initialStats={initialStats}
        initialGraduation={initialGraduation}
        initialTimePerClient={initialTimePerClient}
      />
    </div>
  )
}
