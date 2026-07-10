import { Sparkles } from 'lucide-react'
import { CockpitHeader, CockpitCallout } from '@monprojetpro/ui'

/**
 * Onglet Élio One — placeholder.
 * Restyling cockpit v2 — CockpitHeader ton emerald (thème One), état vide cockpit.
 */
export default function ElioOnePage() {
  return (
    <div className="p-6 space-y-6">
      {/* En-tête cockpit — ton emerald pour refléter le thème One */}
      <CockpitHeader
        icon={Sparkles}
        title="Élio One"
        subtitle="L'agent Élio intégré dans le dashboard One de tes clients gradués."
        tone="emerald"
      />

      {/* État vide — roadmap à venir */}
      <CockpitCallout tone="gray" title="En cours de développement">
        La configuration Élio One (personnalisation du pop-up, deep-links, historique) sera
        disponible dans une prochaine version. Les réglages Élio Hub s&apos;appliquent en
        attendant.
      </CockpitCallout>
    </div>
  )
}
