'use client'

import { useState, useTransition } from 'react'
import { Button, Badge, showSuccess, showError } from '@monprojetpro/ui'
import type { ElioObservation } from '../actions/get-elio-observations'
import { integrateObservation, type ObservationTarget } from '../actions/integrate-observation'
import { formatRelativeDate } from '@monprojetpro/utils'

interface ElioObservationsProps {
  clientId: string
  observations: ElioObservation[]
  onProfileUpdated?: () => void
}

interface IntegrationDialogState {
  observation: ElioObservation
  target: ObservationTarget
}

export function ElioObservations({ clientId, observations, onProfileUpdated }: ElioObservationsProps) {
  const [integratingId, setIntegratingId] = useState<string | null>(null)
  const [activeDialog, setActiveDialog] = useState<IntegrationDialogState | null>(null)
  const [isPending, startTransition] = useTransition()

  if (observations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Aucune observation détectée par Élio Lab pour le moment.
      </p>
    )
  }

  const handleValidate = (obs: ElioObservation, target: ObservationTarget) => {
    setIntegratingId(obs.messageId)
    setActiveDialog(null)

    startTransition(async () => {
      const result = await integrateObservation({
        clientId,
        observation: obs.observation,
        target,
      })

      setIntegratingId(null)

      if (result.error) {
        showError('Impossible d\'intégrer l\'observation. Veuillez réessayer.')
        return
      }

      showSuccess('Observation intégrée dans le profil de communication')
      onProfileUpdated?.()
    })
  }

  return (
    <div className="space-y-3">
      {observations.map((obs) => (
        <div
          key={obs.messageId}
          className="rounded-md border border-border p-3 space-y-2"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm flex-1">{obs.observation}</p>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatRelativeDate(obs.createdAt)}
            </span>
          </div>

          {activeDialog?.observation.messageId === obs.messageId ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs text-muted-foreground self-center">Ajouter dans :</span>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending && integratingId === obs.messageId}
                onClick={() => handleValidate(obs, 'avoid')}
              >
                À éviter
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending && integratingId === obs.messageId}
                onClick={() => handleValidate(obs, 'privilege')}
              >
                À privilégier
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending && integratingId === obs.messageId}
                onClick={() => handleValidate(obs, 'styleNotes')}
              >
                Notes libres
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setActiveDialog(null)}
              >
                Annuler
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending && integratingId === obs.messageId}
              onClick={() => setActiveDialog({ observation: obs, target: 'avoid' })}
            >
              {isPending && integratingId === obs.messageId ? 'Intégration...' : 'Valider'}
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
