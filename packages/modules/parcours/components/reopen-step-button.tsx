'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { Button, Textarea, showSuccess, showError } from '@monprojetpro/ui'
import { reopenStep } from '../actions/reopen-step'

interface ReopenStepButtonProps {
  stepId: string
  clientId: string
  stepNumber: number
  onReopened?: () => void
}

export function ReopenStepButton({
  stepId,
  clientId,
  stepNumber,
  onReopened,
}: ReopenStepButtonProps) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    const result = await reopenStep({ stepId, reason: reason.trim() || undefined })
    setIsLoading(false)

    if (result.error) {
      showError(result.error.message)
      return
    }

    showSuccess('Étape rouverte avec succès')
    setExpanded(false)
    setReason('')

    // Invalider les caches liés à cette étape et aux soumissions du client
    await queryClient.invalidateQueries({ queryKey: ['parcours-steps'] })
    await queryClient.invalidateQueries({ queryKey: ['step-submissions', undefined, clientId] })

    onReopened?.()
  }

  if (!expanded) {
    return (
      <Button
        type="button"
        variant="outline"
        className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 gap-2"
        onClick={() => setExpanded(true)}
      >
        <AlertTriangle className="w-4 h-4" aria-hidden="true" />
        Rouvrir cette étape
      </Button>
    )
  }

  return (
    <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-orange-400">
        <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
        <p className="text-sm font-medium">
          Confirmer la réouverture de l&apos;étape {stepNumber}
        </p>
      </div>

      <div>
        <label
          htmlFor={`reopen-reason-${stepId}`}
          className="block text-sm text-muted-foreground mb-1.5"
        >
          Raison de la réouverture <span className="text-xs">(optionnel)</span>
        </label>
        <Textarea
          id={`reopen-reason-${stepId}`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Ex : Merci de retravailler la section positionnement..."
          className="w-full text-sm"
          maxLength={1000}
          disabled={isLoading}
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="destructive"
          disabled={isLoading}
          onClick={handleConfirm}
          className="gap-2"
        >
          <AlertTriangle className="w-4 h-4" aria-hidden="true" />
          {isLoading ? 'Réouverture...' : 'Confirmer la réouverture'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isLoading}
          onClick={() => {
            setExpanded(false)
            setReason('')
          }}
        >
          Annuler
        </Button>
      </div>
    </div>
  )
}
