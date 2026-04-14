'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  Button,
  Textarea,
  showSuccess,
  showError,
} from '@monprojetpro/ui'
import { suspendClient } from '../actions/suspend-client'
import { AlertTriangle } from 'lucide-react'

interface SuspendClientDialogProps {
  clientId: string
  clientName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SuspendClientDialog({
  clientId,
  clientName,
  open,
  onOpenChange,
}: SuspendClientDialogProps) {
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const handleSuspend = () => {
    startTransition(async () => {
      const result = await suspendClient({
        clientId,
        reason: reason.trim() || undefined,
      })

      if (result.error) {
        showError(result.error.message)
        return
      }

      showSuccess('Client suspendu')
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
      await queryClient.invalidateQueries({ queryKey: ['client', clientId] })
      onOpenChange(false)
      setReason('')
    })
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen && !isPending) {
      setReason('')
    }
    onOpenChange(isOpen)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <AlertDialogTitle>Suspendre le client</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Vous êtes sur le point de suspendre <strong>{clientName}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 p-4">
            <h4 className="text-sm font-semibold mb-2">Conséquences :</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Le client ne pourra plus accéder à son dashboard</li>
              <li>• Toutes ses données seront conservées</li>
              <li>• Vous pourrez le réactiver à tout moment</li>
            </ul>
          </div>

          <div className="space-y-2">
            <label htmlFor="reason" className="text-sm font-medium">
              Raison (optionnel)
            </label>
            <Textarea
              id="reason"
              placeholder="Ex: En attente de paiement, demande client..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={isPending}
            />
            {reason.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {reason.length} / 500 caractères
              </p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleSuspend}
            disabled={isPending}
          >
            {isPending ? 'Suspension...' : 'Suspendre le client'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
