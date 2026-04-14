'use client'

import { useTransition } from 'react'
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
} from '@monprojetpro/ui'
import { reactivateParcours } from '../../parcours/actions/reactivate-parcours'

interface ReactivateParcoursDialogProps {
  clientId: string
  clientName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReactivateParcoursDialog({
  clientId,
  clientName,
  open,
  onOpenChange,
}: ReactivateParcoursDialogProps) {
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await reactivateParcours({ clientId })

      if (result.error) {
        showError(result.error.message)
        return
      }

      await queryClient.invalidateQueries({ queryKey: ['parcours', clientId] })
      await queryClient.invalidateQueries({ queryKey: ['client-parcours', clientId] })
      showSuccess(`Parcours réactivé — ${clientName} a été notifié`)
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Réactiver le parcours de {clientName} ?</DialogTitle>
          <DialogDescription>
            Le client retrouvera accès à son parcours Lab et Élio Lab sera réactivé.
            Il recevra une notification automatique.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Réactivation...' : 'Réactiver le parcours'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
