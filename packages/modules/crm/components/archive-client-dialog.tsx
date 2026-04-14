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
  showSuccess,
  showError,
} from '@monprojetpro/ui'
import { archiveClient } from '../actions/archive-client'
import { ArchiveIcon } from 'lucide-react'

interface ArchiveClientDialogProps {
  clientId: string
  clientName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ArchiveClientDialog({
  clientId,
  clientName,
  open,
  onOpenChange,
}: ArchiveClientDialogProps) {
  const [retentionDays, setRetentionDays] = useState(90)
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const handleArchive = () => {
    startTransition(async () => {
      const result = await archiveClient({ clientId, retentionDays })

      if (result.error) {
        showError(result.error.message)
        return
      }

      showSuccess('Client archivé')
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
      await queryClient.invalidateQueries({ queryKey: ['client', clientId] })
      onOpenChange(false)
    })
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen && !isPending) {
      setRetentionDays(90)
    }
    onOpenChange(isOpen)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <ArchiveIcon className="h-5 w-5 text-muted-foreground" />
            <AlertDialogTitle>Archiver le client</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Archiver <strong>{clientName}</strong> ?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 p-4">
            <h4 className="text-sm font-semibold mb-2">Conséquences :</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Le client perdra l&apos;accès immédiatement</li>
              <li>• Données conservées {retentionDays} jours puis anonymisées</li>
              <li>• Réactivation possible pendant la période de rétention</li>
            </ul>
          </div>

          <div className="space-y-2">
            <label htmlFor="retention-days" className="text-sm font-medium">
              Période de rétention : <strong>{retentionDays} jours</strong>
            </label>
            <input
              id="retention-days"
              type="range"
              min={30}
              max={365}
              step={10}
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              className="w-full accent-primary"
              disabled={isPending}
              aria-label={`Période de rétention : ${retentionDays} jours`}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>30 jours</span>
              <span>365 jours</span>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleArchive}
            disabled={isPending}
            data-testid="confirm-archive-button"
          >
            {isPending ? 'Archivage...' : "Confirmer l'archivage"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
