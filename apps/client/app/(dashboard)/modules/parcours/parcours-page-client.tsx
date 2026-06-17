'use client'

import { useState } from 'react'
import { ParcoursOverview } from '@monprojetpro/module-parcours'
import { ElioChat } from '@monprojetpro/module-elio'
import { Dialog, DialogContent, DialogTitle } from '@monprojetpro/ui'
import { ElioVeille } from '../../../../components/elio-veille'

interface ParcoursPageClientProps {
  clientId: string
  clientFirstName?: string | null
  /** Agents du parcours coupés par MiKL (le Concierge reste dispo). */
  agentsPaused: boolean
  /** Consentement IA accordé → le Concierge peut répondre dans la pop-up. */
  iaConsentGranted: boolean
}

/**
 * Orchestration client de la home « Mon Parcours » :
 * - rend le parcours (ParcoursOverview) avec le bandeau Concierge ;
 * - le bouton « Pose-moi une question » ouvre une pop-up ÉPHÉMÈRE de chat avec le Concierge.
 *
 * La pop-up est volontairement éphémère : pas de userId → ElioChat rend sa version simple
 * (aucune liste de conversations, aucun historique). Le client pose sa question, lit la
 * réponse, ferme la pop-up → la conversation disparaît. Le chat persistant avec historique
 * est réservé à One (page /modules/elio) ; en Lab, on ne le veut pas.
 *
 * Assemblage au niveau app — un module ne peut pas en importer un autre, mais l'app le peut.
 */
export function ParcoursPageClient({
  clientId,
  clientFirstName,
  agentsPaused,
  iaConsentGranted,
}: ParcoursPageClientProps) {
  const [conciergeOpen, setConciergeOpen] = useState(false)

  return (
    <>
      <ParcoursOverview
        clientId={clientId}
        clientFirstName={clientFirstName}
        agentsPaused={agentsPaused}
        onAskConcierge={() => setConciergeOpen(true)}
      />

      <Dialog open={conciergeOpen} onOpenChange={setConciergeOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">Élio, le Concierge</DialogTitle>
          <div className="h-[70vh]">
            {iaConsentGranted ? (
              // Pas de userId → chat éphémère (ni historique, ni liste de conversations).
              <ElioChat dashboardType="lab" clientId={clientId} />
            ) : (
              <ElioVeille />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
