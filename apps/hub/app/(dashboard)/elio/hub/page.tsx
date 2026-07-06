import {
  getLlmConfig,
  getAlertThresholds,
  listElioHubActions,
  DEFAULT_LLM_CONFIG,
  DEFAULT_ALERT_THRESHOLDS,
} from '@monprojetpro/module-elio'
import { LlmConfigSection } from './llm-config-section'
import { AlertThresholdsSection } from './alert-thresholds-section'
import { HubActionsHistory } from './hub-actions-history'

/**
 * Onglet Élio Hub — centre de pilotage (T5 Pilotage).
 * 3 sections : config LLM par profils, seuils d'alertes, historique des actions.
 */
export default async function ElioHubTabPage() {
  const [llmResult, thresholdsResult, actionsResult] = await Promise.all([
    getLlmConfig(),
    getAlertThresholds(),
    listElioHubActions(),
  ])

  return (
    <div className="p-6 space-y-10">
      <div>
        <h2 className="text-base font-semibold text-foreground">Élio Hub — Centre de pilotage</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Cerveau LLM, seuils d&apos;alertes et journal des actions de ton bras droit.
        </p>
      </div>

      <LlmConfigSection initialConfig={llmResult.data ?? DEFAULT_LLM_CONFIG} />

      <div className="border-t border-border/40 pt-8">
        <AlertThresholdsSection initialThresholds={thresholdsResult.data ?? DEFAULT_ALERT_THRESHOLDS} />
      </div>

      <div className="border-t border-border/40 pt-8">
        <HubActionsHistory initialActions={actionsResult.data ?? []} />
      </div>
    </div>
  )
}
