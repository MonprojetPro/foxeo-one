'use client'

import { useState } from 'react'
import { CoreDashboard } from '@monprojetpro/module-core-dashboard'
import { ElioChat, ELIO_MODEL_MICRO, type ConciergeWord } from '@monprojetpro/module-elio'
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
 * Orchestrateur client de l'accueil One (vision v2 — refonte 2026-06-25).
 *
 * Assemble — au niveau APP, car un module ne peut pas en importer un autre — deux briques :
 *   1. Bandeau « Élio One »                          → OneConciergeBanner (perso One, vert)
 *   2. Cockpit One (cartes métriques façon Hub)      → OneActivityCockpit (tout branché)
 *
 * Plus de hero construction, plus de grille « Accès rapide » (la sidebar joue ce rôle). La
 * structure est volontairement resserrée : bandeau d'abord, cockpit ensuite, pleine largeur.
 *
 * Le bouton « Poser une question » du bandeau ouvre une pop-up de chat Élio One ÉPHÉMÈRE,
 * exactement comme le Concierge Lab (`parcours-page-client.tsx`) : `ElioChat` SANS `userId`
 * → version simple, sans liste de conversations ni historique. Le client pose sa question,
 * lit la réponse, ferme — la conversation disparaît.
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
          <DialogTitle className="sr-only">Élio One</DialogTitle>
          <div className="h-[70vh]">
            {iaConsentGranted ? (
              // Pas de userId → chat éphémère (ni liste de conversations). Mais clientId →
              // contexte One complet, et model micro (Haiku) → réponse rapide. La mémoire
              // intra-session est assurée par l'historique inline (cf. useElioChat).
              <ElioChat dashboardType="one" clientId={clientId} model={ELIO_MODEL_MICRO} />
            ) : (
              <ElioVeille />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
