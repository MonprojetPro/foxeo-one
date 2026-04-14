'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Textarea,
  showSuccess,
  showError,
} from '@monprojetpro/ui'
import { requestParcoursAbandonment } from '../actions/request-abandonment'
import { ABANDONMENT_REASONS } from '../types/parcours.types'

interface AbandonParcoursDialogProps {
  clientId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  completedSteps: number
  totalSteps: number
}

export function AbandonParcoursDialog({
  clientId,
  open,
  onOpenChange,
  completedSteps,
  totalSteps,
}: AbandonParcoursDialogProps) {
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const effectiveReason = showCustomInput ? customReason : selectedReason

  function handleSelectReason(reason: string) {
    setSelectedReason(reason)
    setShowCustomInput(false)
    setCustomReason('')
  }

  function handleSelectCustom() {
    setSelectedReason(null)
    setShowCustomInput(true)
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await requestParcoursAbandonment({
        clientId,
        reason: effectiveReason ?? undefined,
      })

      if (result.error) {
        showError(result.error.message)
        return
      }

      await queryClient.invalidateQueries({ queryKey: ['parcours', clientId] })
      await queryClient.invalidateQueries({ queryKey: ['client-parcours', clientId] })
      showSuccess('Votre demande a été envoyée à MiKL. Il vous contactera prochainement.')
      onOpenChange(false)
      // Reset state
      setSelectedReason(null)
      setCustomReason('')
      setShowCustomInput(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            Êtes-vous sûr de vouloir quitter votre parcours Lab ?
          </DialogTitle>
          <DialogDescription>
            Cette action mettra votre parcours en pause.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progression recap */}
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-sm font-medium text-foreground">
              {completedSteps}/{totalSteps} étapes complétées
            </p>
          </div>

          {/* Reason suggestions */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Pourriez-vous nous dire pourquoi ? (optionnel)
            </p>
            <div className="space-y-2">
              {ABANDONMENT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => handleSelectReason(reason)}
                  className={[
                    'w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors',
                    selectedReason === reason && !showCustomInput
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-accent',
                  ].join(' ')}
                >
                  {reason}
                </button>
              ))}
              <button
                type="button"
                onClick={handleSelectCustom}
                className={[
                  'w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors',
                  showCustomInput
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:bg-accent',
                ].join(' ')}
              >
                Autre raison...
              </button>
            </div>

            {showCustomInput && (
              <Textarea
                value={customReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomReason(e.target.value)}
                placeholder="Décrivez votre raison..."
                className="mt-2"
                rows={3}
              />
            )}
          </div>

          {/* Reassuring message */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-sm text-muted-foreground">
              Vos données et documents seront conservés. MiKL vous contactera pour en discuter.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? 'En cours...' : "Confirmer l'abandon"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Continuer mon parcours
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
