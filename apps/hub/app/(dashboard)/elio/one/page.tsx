import { Sparkles } from 'lucide-react'
import { getOnePopupConfig, getGraduatedOneClients, DEFAULT_ONE_POPUP_CONFIG } from '@monprojetpro/module-elio'
import { CockpitHeader } from '@monprojetpro/ui'
import { OnePopupSection } from './one-popup-section'

/**
 * Onglet Élio One — personnalisation de la pop-up (lot 1).
 * Réglage global (tous les clients gradués) + surcharge par client.
 * Restyling cockpit v2 — CockpitHeader ton emerald (thème One).
 */
export default async function ElioOnePage() {
  const [configResult, clientsResult] = await Promise.all([
    getOnePopupConfig(),
    getGraduatedOneClients(),
  ])

  return (
    <div className="p-6 space-y-8">
      {/* En-tête cockpit — ton emerald pour refléter le thème One */}
      <CockpitHeader
        icon={Sparkles}
        title="Élio One"
        subtitle="Personnalise la pop-up Élio du dashboard One de tes clients gradués."
        tone="emerald"
      />

      <OnePopupSection
        initialConfig={configResult.data ?? DEFAULT_ONE_POPUP_CONFIG}
        clients={clientsResult.data ?? []}
      />
    </div>
  )
}
