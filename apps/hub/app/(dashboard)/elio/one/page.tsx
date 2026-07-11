import { Sparkles } from 'lucide-react'
import {
  getOnePopupConfig,
  getGraduatedOneClients,
  getEscalationConfig,
  listRecentEscalations,
  getOneNavigationConfig,
  getOneActivity,
  DEFAULT_ONE_POPUP_CONFIG,
  DEFAULT_ESCALATION_CONFIG,
  DEFAULT_ONE_NAVIGATION_CONFIG,
} from '@monprojetpro/module-elio'
import { CockpitHeader } from '@monprojetpro/ui'
import { OnePopupSection } from './one-popup-section'
import { EscaladeSection } from './escalade-section'
import { NavigationSection } from './navigation-section'
import { ActiviteSection } from './activite-section'

/**
 * Onglet Élio One — centre de pilotage de l'agent Élio du dashboard One.
 * 4 volets : personnalisation pop-up (lot 1), escalade vers MiKL (lot 2),
 * navigation deep-links (lot 3), activité par client gradué (lot 4).
 * Restyling cockpit v2 — CockpitHeader ton emerald (thème One).
 */
export default async function ElioOnePage() {
  const [
    configResult,
    clientsResult,
    escalationResult,
    recentEscalationsResult,
    navResult,
    activityResult,
  ] = await Promise.all([
    getOnePopupConfig(),
    getGraduatedOneClients(),
    getEscalationConfig(),
    listRecentEscalations(),
    getOneNavigationConfig(),
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

      {/* Lot 1 — Personnalisation de la pop-up (global + surcharge client) */}
      <OnePopupSection
        initialConfig={configResult.data ?? DEFAULT_ONE_POPUP_CONFIG}
        clients={clientsResult.data ?? []}
      />

      {/* Lot 2 — Escalade vers MiKL */}
      <div className="border-t border-white/5 pt-8">
        <EscaladeSection
          initialConfig={escalationResult.data ?? DEFAULT_ESCALATION_CONFIG}
          recentEscalations={recentEscalationsResult.data ?? []}
        />
      </div>

      {/* Lot 3 — Deep-links & navigation */}
      <div className="border-t border-white/5 pt-8">
        <NavigationSection initialConfig={navResult.data ?? DEFAULT_ONE_NAVIGATION_CONFIG} />
      </div>

      {/* Lot 4 — Activité Élio One par client gradué */}
      <div className="border-t border-white/5 pt-8">
        <ActiviteSection rows={activityResult.data ?? []} />
      </div>
    </div>
  )
}
