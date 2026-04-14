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
  Input,
  showSuccess,
  showError,
} from '@monprojetpro/ui'
import { closeClient } from '../actions/close-client'
import { AlertTriangle, Lock } from 'lucide-react'

interface CloseClientDialogProps {
  clientId: string
  clientName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CloseClientDialog({
  clientId,
  clientName,
  open,
  onOpenChange,
}: CloseClientDialogProps) {
  const [confirmName, setConfirmName] = useState('')
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  // Case-insensitive, trimmed comparison
  const isConfirmValid =
    confirmName.trim().toLowerCase() === clientName.trim().toLowerCase()

  const handleClose = () => {
    startTransition(async () => {
      const result = await closeClient({
        clientId,
        confirmName,
      })

      if (result.error) {
        showError(result.error.message)
        return
      }

      showSuccess('Client clôturé')
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
      await queryClient.invalidateQueries({ queryKey: ['client', clientId] })
      onOpenChange(false)
      setConfirmName('')
    })
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !isPending) {
      setConfirmName('')
    }
    onOpenChange(isOpen)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-red-600" />
            <AlertDialogTitle>Clôturer le client</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Vous êtes sur le point de clôturer définitivement{' '}
            <strong>{clientName}</strong>. Cette action archivera toutes ses données.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold mb-2">Conséquences :</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Le client ne pourra plus se connecter</li>
                  <li>• Toutes ses données seront archivées en lecture seule</li>
                  <li>• Le client n'apparaîtra plus dans la liste par défaut</li>
                  <li>• Vous pourrez le réactiver si nécessaire</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmName" className="text-sm font-medium">
              Pour confirmer, tapez le nom du client :{' '}
              <span className="font-semibold">{clientName}</span>
            </label>
            <Input
              id="confirmName"
              placeholder="Nom du client"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              disabled={isPending}
              autoComplete="off"
            />
            {confirmName.length > 0 && !isConfirmValid && (
              <p className="text-xs text-red-600">
                Le nom saisi ne correspond pas
              </p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleClose}
            disabled={isPending || !isConfirmValid}
          >
            {isPending ? 'Clôture...' : 'Clôturer définitivement'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
