import { BrainCircuit } from 'lucide-react'
import {
  getLlmConfig,
  getAlertThresholds,
  getHubDirectives,
  listElioHubActions,
  DEFAULT_LLM_CONFIG,
  DEFAULT_ALERT_THRESHOLDS,
} from '@monprojetpro/module-elio'
import { CockpitHeader } from '@monprojetpro/ui'
import { LlmConfigSection } from './llm-config-section'
import { AlertThresholdsSection } from './alert-thresholds-section'
import { HubDirectivesSection } from './hub-directives-section'
import { HubActionsHistory } from './hub-actions-history'

/**
 * Onglet Élio Hub — centre de pilotage (T5 Pilotage).
 * 4 sections : config LLM par profils, seuils d'alertes, directives permanentes,
 * historique des actions.
 * Restyling cockpit v2 — en-tête CockpitHeader, séparateurs affinés.
 */
export default async function ElioHubTabPage() {
  const [llmResult, thresholdsResult, directivesResult, actionsResult] = await Promise.all([
    getLlmConfig(),
    getAlertThresholds(),
    getHubDirectives(),
    listElioHubActions(),
  ])

  return (
    <div className="p-6 space-y-10">
      {/* En-tête cockpit — signature visuelle Hub */}
      <CockpitHeader
        icon={BrainCircuit}
        title="Élio Hub — Centre de pilotage"
        subtitle="Cerveau LLM, seuils d'alertes et journal des actions de ton bras droit."
        tone="cyan"
      />

      <LlmConfigSection initialConfig={llmResult.data ?? DEFAULT_LLM_CONFIG} />

      {/* Séparateurs style cockpit (blanc/5 au lieu de border/40) */}
      <div className="border-t border-white/5 pt-8">
        <AlertThresholdsSection initialThresholds={thresholdsResult.data ?? DEFAULT_ALERT_THRESHOLDS} />
      </div>

      <div className="border-t border-white/5 pt-8">
        <HubDirectivesSection initialDirectives={directivesResult.data ?? []} />
      </div>

      <div className="border-t border-white/5 pt-8">
        <HubActionsHistory initialActions={actionsResult.data ?? []} />
      </div>
    </div>
  )
}
