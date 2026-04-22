import { getElioLabAgents, getTokenUsageSummary, getTokenBudgetAlert } from '@monprojetpro/module-elio'
import { ElioLabCatalogue } from '@monprojetpro/module-elio'
import { ElioLabTokenDashboard } from './elio-lab-token-dashboard'

export default async function ElioLabPage() {
  const [agentsResult, summaryResult, budgetResult] = await Promise.all([
    getElioLabAgents({ includeArchived: false }),
    getTokenUsageSummary(),
    getTokenBudgetAlert(),
  ])

  return (
    <div className="p-6 space-y-8">
      <ElioLabCatalogue initialAgents={agentsResult.data ?? []} />

      <div className="border-t border-border/40 pt-8">
        <ElioLabTokenDashboard
          initialSummary={summaryResult.data}
          initialBudget={budgetResult.data?.budgetEur ?? null}
        />
      </div>
    </div>
  )
}
