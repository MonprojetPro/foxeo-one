import { getPortfolioStats, getGraduationRate, getTimePerClient } from '@monprojetpro/modules-crm'
import { StatsPageClient } from './stats-page-client'

export default async function StatsPage() {
  // Parallel data fetching (RSC pattern)
  const [statsResult, graduationResult, timeResult] = await Promise.all([
    getPortfolioStats(),
    getGraduationRate(),
    getTimePerClient(),
  ])

  return (
    <StatsPageClient
      initialStats={statsResult.data ?? undefined}
      initialGraduation={graduationResult.data ?? undefined}
      initialTimePerClient={timeResult.data ?? undefined}
    />
  )
}
