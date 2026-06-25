'use client'

import { useState } from 'react'
import { CoreDashboard } from '@monprojetpro/module-core-dashboard'
import { ElioChat, type ConciergeWord } from '@monprojetpro/module-elio'
import { Dialog, DialogContent, DialogTitle } from '@monprojetpro/ui'
import type { ClientConfig } from '@monprojetpro/types'
import { OneConciergeBanner } from './one-concierge-banner'
import { OneActivityCockpit } from './one-activity-cockpit'
import { ElioVeille } from './elio-veille'

interface OneHomeProps {
  clientId: string
  userId: string
  clientName: string
  clientConfig: ClientConfig
  showTeasing: boolean
  /** « Dernier mot d'Élio » côté One, fetché en SSR (hydratation du bandeau). */
  initialConciergeWord: ConciergeWord | null
  /** Consentement IA (RGPD) — conditionne le chat Élio dans la pop-up. */
  iaConsentGranted: boolean
}

/**
 * Orchestrateur client de l'accueil One (vision v2).
 *
 * Assemble — au niveau APP, car un module ne peut pas en importer un autre — les briques :
 *   1. Bandeau Élio Concierge One (Realtime, mot proactif)   → OneConciergeBanner
 *   2. Cockpit d'activités réelles (suivi-outil + notifs)    → OneActivityCockpit
 *   3. Accès aux modules du socle                            → CoreDashboard (grille)
 *
 * Hiérarchie : Concierge → Cockpit → Accès modules. Pleine largeur exploitée.
 *
 * Le bouton « Poser une question » du bandeau ouvre une pop-up de chat Élio One éphémère
 * (même UX que le Concierge Lab). Le chat persistant complet reste sur /modules/elio.
 */
export function OneHome({
  clientId,
  userId,
  clientName,
  clientConfig,
  showTeasing,
  initialConciergeWord,
  iaConsentGranted,
}: OneHomeProps) {
  const [conciergeOpen, setConciergeOpen] = useState(false)

  return (
    <>
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
              onAskConcierge={() => setConciergeOpen(true)}
            />
            <OneActivityCockpit clientId={clientId} userId={userId} />
          </div>
        }
      />

      <Dialog open={conciergeOpen} onOpenChange={setConciergeOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">Élio, le Concierge</DialogTitle>
          <div className="h-[70vh]">
            {iaConsentGranted ? (
              <ElioChat dashboardType="one" clientId={clientId} userId={userId} />
            ) : (
              <ElioVeille />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
