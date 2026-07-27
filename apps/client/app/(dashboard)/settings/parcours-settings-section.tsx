'use client'

import { useState } from 'react'
import { useParcours, AbandonParcoursDialog } from '@monprojetpro/module-parcours'
import { useClientReadOnly } from '@monprojetpro/ui'

interface ParcoursSettingsSectionProps {
  clientId?: string
}

const ABANDONABLE_STATUSES = ['en_cours', 'in_progress', 'not_started', 'suspendu']

export function ParcoursSettingsSection({ clientId }: ParcoursSettingsSectionProps) {
  if (!clientId) return null

  return <ParcoursSettingsContent clientId={clientId} />
}

function ParcoursSettingsContent({ clientId }: { clientId: string }) {
  const { data: parcours } = useParcours(clientId)
  const [abandonDialogOpen, setAbandonDialogOpen] = useState(false)
  // Espace figé — un parcours déjà arrêté par la fin d'abonnement n'a plus à être quitté.
  const readOnly = useClientReadOnly()

  if (!parcours) return null

  const canAbandon = !readOnly && ABANDONABLE_STATUSES.includes(parcours.status)
  const isAbandoned = parcours.status === 'abandoned'

  const statusLabels: Record<string, string> = {
    en_cours: 'En cours',
    in_progress: 'En cours',
    not_started: 'Non démarré',
    suspendu: 'Suspendu',
    termine: 'Terminé',
    abandoned: 'En pause',
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-base font-medium text-foreground">Mon parcours Lab</h2>
        <p className="text-sm text-muted-foreground">
          {/* Abonnement terminé : afficher « En cours » serait faux — le parcours est arrêté,
              quel que soit le statut resté en base. */}
          Statut : {readOnly ? 'Arrêté — abonnement terminé' : statusLabels[parcours.status] ?? parcours.status}
        </p>
      </div>

      {readOnly && (
        <p className="text-sm text-muted-foreground">
          Votre parcours reste consultable : vous pouvez relire vos étapes et télécharger vos
          documents. Pour reprendre, écrivez à MiKL.
        </p>
      )}

      {isAbandoned && !readOnly && (
        <p className="text-sm text-muted-foreground">
          Votre parcours est en pause. MiKL va vous contacter pour en discuter.
        </p>
      )}

      {canAbandon && (
        <button
          type="button"
          onClick={() => setAbandonDialogOpen(true)}
          className="text-sm text-muted-foreground hover:text-destructive transition-colors"
        >
          Quitter le parcours
        </button>
      )}

      <AbandonParcoursDialog
        clientId={clientId}
        open={abandonDialogOpen}
        onOpenChange={setAbandonDialogOpen}
        completedSteps={parcours.completedSteps ?? 0}
        totalSteps={parcours.totalSteps ?? 0}
      />
    </div>
  )
}
