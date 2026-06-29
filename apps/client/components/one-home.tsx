'use client'

import { CoreDashboard } from '@monprojetpro/module-core-dashboard'
import type { ConciergeWord } from '@monprojetpro/module-elio'
import type { ClientConfig } from '@monprojetpro/types'
import { OneConciergeBanner } from './one-concierge-banner'
import { OneActivityCockpit } from './one-activity-cockpit'
import { openElioOnePopup } from './use-elio-one-popup'

interface OneHomeProps {
  clientId: string
  userId: string
  clientName: string
  clientConfig: ClientConfig
  showTeasing: boolean
  /** « Dernier mot d'Élio » côté One, fetché en SSR (hydratation du bandeau). */
  initialConciergeWord: ConciergeWord | null
}

/**
 * Orchestrateur client de l'accueil One (vision v2 — refonte 2026-06-25).
 *
 * Assemble — au niveau APP, car un module ne peut pas en importer un autre — deux briques :
 *   1. Bandeau « Élio One »                          → OneConciergeBanner (perso One, vert)
 *   2. Cockpit One (cartes métriques façon Hub)      → OneActivityCockpit (tout branché)
 *
 * Le bouton « Poser une question » du bandeau ouvre la pop-up Élio One UNIQUE (montée dans le
 * layout, `ElioOnePopup`) via `openElioOnePopup()` — la MÊME que le widget sidebar. Plus de
 * pop-up locale dupliquée : une seule expérience éphémère verte partout (refonte 2026-06-29).
 */
export function OneHome({
  clientId,
  userId,
  clientName,
  clientConfig,
  showTeasing,
  initialConciergeWord,
}: OneHomeProps) {
  return (
    <CoreDashboard
      clientConfig={clientConfig}
      clientName={clientName}
      showTeasing={showTeasing}
      headerSlot={
        <div className="space-y-7">
          <OneConciergeBanner
            clientId={clientId}
            clientFirstName={clientName}
            initialWord={initialConciergeWord}
            onAskConcierge={openElioOnePopup}
          />
          <OneActivityCockpit clientId={clientId} userId={userId} />
        </div>
      }
    />
  )
}
