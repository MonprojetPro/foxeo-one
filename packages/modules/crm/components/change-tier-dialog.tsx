'use client'

import { useState, useEffect, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  showSuccess,
  showError,
} from '@foxeo/ui'
import { changeClientTier } from '../actions/change-tier'
import { TIER_INFO, TIER_BADGE_CLASSES, isDowngradeFromOnePlus } from '../utils/tier-helpers'
import type { SubscriptionTier } from '../types/subscription.types'

interface ChangeTierDialogProps {
  clientId: string
  clientName: string
  currentTier: SubscriptionTier
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangeTierDialog({
  clientId,
  clientName,
  currentTier,
  open,
  onOpenChange,
}: ChangeTierDialogProps) {
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(currentTier)
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  // Reset selection when dialog reopens or currentTier changes
  useEffect(() => {
    if (open) setSelectedTier(currentTier)
  }, [open, currentTier])

  const showDowngradeWarning = isDowngradeFromOnePlus(currentTier, selectedTier)
  const tiers: SubscriptionTier[] = ['base', 'essentiel', 'agentique']

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await changeClientTier({ clientId, newTier: selectedTier })

      if (result.error) {
        showError(result.error.message)
        return
      }

      await queryClient.invalidateQueries({ queryKey: ['client', clientId] })
      await queryClient.invalidateQueries({ queryKey: ['client-config', clientId] })

      showSuccess(
        `Tier modifié — ${clientName} est maintenant en ${TIER_INFO[selectedTier].name}`
      )
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le tier d'abonnement</DialogTitle>
          <DialogDescription>
            Choisissez le nouveau tier pour {clientName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Options de tier */}
          <div className="space-y-2">
            {tiers.map((tier) => {
              const info = TIER_INFO[tier]
              const isCurrentTier = tier === currentTier
              const isSelected = tier === selectedTier

              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setSelectedTier(tier)}
                  className={[
                    'w-full text-left rounded-lg border p-3 transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={[
                        'w-4 h-4 rounded-full border-2 flex-shrink-0',
                        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground',
                      ].join(' ')}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{info.name}</span>
                        <span className="text-sm text-muted-foreground">{info.price}</span>
                        {isCurrentTier && (
                          <span
                            className={[
                              'text-xs px-1.5 py-0.5 rounded-full font-medium',
                              TIER_BADGE_CLASSES[tier],
                            ].join(' ')}
                          >
                            (actuel)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>
                      <p className="text-xs text-primary/80 mt-0.5">Élio : {info.elio}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Warning downgrade One+ */}
          {showDowngradeWarning && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">
                <strong>Attention :</strong> le passage de Agentique à{' '}
                {TIER_INFO[selectedTier].name} désactivera les fonctionnalités Elio One+
                (actions, génération de documents, alertes proactives).
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={isPending || selectedTier === currentTier}
            >
              {isPending ? 'Modification…' : 'Confirmer le changement'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

ChangeTierDialog.displayName = 'ChangeTierDialog'
