import { Bot } from 'lucide-react'
import { getElioLabAgents, getTokenUsageSummary, getTokenBudgetAlert } from '@monprojetpro/module-elio'
import { ElioLabCatalogue } from '@monprojetpro/module-elio'
import { CockpitHeader } from '@monprojetpro/ui'
import { ElioLabTokenDashboard } from './elio-lab-token-dashboard'

/**
 * Onglet Élio Lab — catalogue d'agents + consommation tokens.
 * Restyling cockpit v2 — CockpitHeader violet (thème Lab), séparateur affiné.
 */
export default async function ElioLabPage() {
  const [agentsResult, summaryResult, budgetResult] = await Promise.all([
    getElioLabAgents({ includeArchived: false }),
    getTokenUsageSummary(),
    getTokenBudgetAlert(),
  ])

  return (
    <div className="p-6 space-y-8">
      {/* En-tête cockpit — ton violet pour refléter le thème Lab */}
      <CockpitHeader
        icon={Bot}
        title="Agents Élio Lab"
        subtitle="Catalogue d'agents de parcours et consommation IA — mois en cours."
        tone="violet"
      />

      <ElioLabCatalogue initialAgents={agentsResult.data ?? []} />

      {/* Séparateur style cockpit */}
      <div className="border-t border-white/5 pt-8">
        <ElioLabTokenDashboard
          initialSummary={summaryResult.data}
          initialBudget={budgetResult.data?.budgetEur ?? null}
        />
      </div>
    </div>
  )
}
