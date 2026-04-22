import { ElioHubDashboard } from './elio-hub-dashboard'
import { getTokenUsageSummary } from '@monprojetpro/module-elio'
import { getTokenBudgetAlert } from '@monprojetpro/module-elio'

export default async function ElioHubTabPage() {
  const [summaryResult, budgetResult] = await Promise.all([
    getTokenUsageSummary(),
    getTokenBudgetAlert(),
  ])

  return (
    <ElioHubDashboard
      initialSummary={summaryResult.data}
      initialBudget={budgetResult.data?.budgetEur ?? null}
    />
  )
}
