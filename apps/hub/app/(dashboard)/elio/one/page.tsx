import { Sparkles } from 'lucide-react'
import {
  getOnePopupConfig,
  getEscalationConfig,
  listRecentEscalations,
  getOneActivity,
  DEFAULT_ONE_POPUP_CONFIG,
  DEFAULT_ESCALATION_CONFIG,
} from '@monprojetpro/module-elio'
import { CockpitHeader } from '@monprojetpro/ui'
import { OnePopupSection } from './one-popup-section'
import { EscaladeSection } from './escalade-section'
import { ActiviteSection } from './activite-section'

/**
 * Onglet Élio One — centre de pilotage de l'agent Élio du dashboard One.
 * 3 volets : personnalisation pop-up (lot 1), escalade vers MiKL (lot 2),
 * activité par client gradué (lot 4). Le volet « navigation deep-links » a été
 * retiré (décision MiKL 2026-07-12 — usage flou côté opérateur).
 * Restyling cockpit v2 — CockpitHeader ton emerald (thème One).
 */
export default async function ElioOnePage() {
  const [
    configResult,
    escalationResult,
    recentEscalationsResult,
    activityResult,
  ] = await Promise.all([
    getOnePopupConfig(),
    getEscalationConfig(),
    listRecentEscalations(),
    getOneActivity(),
  ])

  return (
    <div className="p-6 space-y-8">
      {/* En-tête cockpit — ton emerald pour refléter le thème One */}
      <CockpitHeader
        icon={Sparkles}
        title="Élio One — Centre de pilotage"
        subtitle="Pop-up, escalade, navigation et activité de l'agent Élio de tes clients gradués."
        tone="emerald"
      />

      {/* Lot 1 — Personnalisation de la pop-up (global) */}
      <OnePopupSection initialConfig={configResult.data ?? DEFAULT_ONE_POPUP_CONFIG} />

      {/* Lot 2 — Escalade vers MiKL */}
      <div className="border-t border-white/5 pt-8">
        <EscaladeSection
          initialConfig={escalationResult.data ?? DEFAULT_ESCALATION_CONFIG}
          recentEscalations={recentEscalationsResult.data ?? []}
        />
      </div>

      {/* Lot 4 — Activité Élio One par client gradué */}
      <div className="border-t border-white/5 pt-8">
        <ActiviteSection rows={activityResult.data ?? []} />
      </div>
    </div>
  )
}
