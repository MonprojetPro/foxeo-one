'use client'

import { useState } from 'react'
import { ParcoursOverview } from '@monprojetpro/module-parcours'
import { ElioChat } from '@monprojetpro/module-elio'
import { Dialog, DialogContent, DialogTitle } from '@monprojetpro/ui'
import { ElioVeille } from '../../../../components/elio-veille'

interface ParcoursPageClientProps {
  clientId: string
  clientFirstName?: string | null
  userId: string
  /** Agents du parcours coupés par MiKL (le Concierge reste dispo). */
  agentsPaused: boolean
  /** Consentement IA accordé → le Concierge peut répondre dans la pop-up. */
  iaConsentGranted: boolean
}

/**
 * Orchestration client de la home « Mon Parcours » :
 * - rend le parcours (ParcoursOverview) avec le bandeau Concierge ;
 * - le bouton « Pose-moi une question » du bandeau ouvre une pop-up contenant le chat
 *   du Concierge (ElioChat dashboardType='lab').
 *
 * C'est ici (niveau app) qu'on assemble les deux modules — un module ne peut pas en
 * importer un autre (règle d'archi), mais l'app le peut.
 */
export function ParcoursPageClient({
  clientId,
  clientFirstName,
  userId,
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
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">Élio, le Concierge</DialogTitle>
          <div className="h-[70vh]">
            {iaConsentGranted ? (
              <ElioChat dashboardType="lab" clientId={clientId} userId={userId} />
            ) : (
              <ElioVeille />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
