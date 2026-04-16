'use client'

import { useTransition } from 'react'
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
  Separator,
  showSuccess,
  showError,
} from '@monprojetpro/ui'
import { startLabExitKit } from '@monprojetpro/module-parcours'

interface LabExitKitDialogProps {
  clientId: string
  clientName: string
  clientCompany: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LabExitKitDialog({
  clientId,
  clientName,
  clientCompany,
  open,
  onOpenChange,
}: LabExitKitDialogProps) {
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await startLabExitKit({ clientId })

      if (result.error) {
        showError(result.error.message)
        return
      }

      showSuccess(`Kit de sortie Lab généré — lien de téléchargement créé (valable 14 jours)`)
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
      await queryClient.invalidateQueries({ queryKey: ['client', clientId] })
      onOpenChange(false)
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Kit de sortie Lab</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action va exporter tous les documents, briefs et conversations Élio Lab
            du client dans un ZIP téléchargeable, puis archiver son accès Lab.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Client</span>
            <span className="text-sm font-medium">{clientName} — {clientCompany}</span>
          </div>
          <Separator />
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Le ZIP contiendra :</p>
            <ul className="list-disc list-inside text-xs space-y-0.5">
              <li>Documents uploadés pendant le parcours Lab</li>
              <li>Briefs soumis (validés et en cours)</li>
              <li>PRD consolidé (si des briefs sont validés)</li>
              <li>Transcripts des conversations Élio Lab</li>
            </ul>
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">
            Le lien de téléchargement sera valable 14 jours.
            L&apos;accès Lab du client sera coupé 7 jours après la génération.
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
            data-testid="confirm-lab-exit-kit-button"
          >
            {isPending ? 'Génération en cours…' : 'Confirmer le kit de sortie Lab'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
