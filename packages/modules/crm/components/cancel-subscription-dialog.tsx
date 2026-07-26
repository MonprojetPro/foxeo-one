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
import { CircleSlash } from 'lucide-react'
import { cancelSubscription } from '../actions/cancel-subscription'

interface CancelSubscriptionDialogProps {
  clientId: string
  clientName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Confirmation de résiliation.
 *
 * L'écran dit explicitement ce que le client GARDE avant ce qu'il perd : la résiliation
 * n'est pas une expulsion, et MiKL doit pouvoir l'annoncer sans ambiguïté. C'est aussi
 * ce qui rend l'action tenable — elle est réversible d'un clic.
 */
export function CancelSubscriptionDialog({
  clientId,
  clientName,
  open,
  onOpenChange,
}: CancelSubscriptionDialogProps) {
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelSubscription({
        clientId,
        reason: reason.trim() || undefined,
      })

      if (result.error) {
        showError(result.error.message)
        return
      }

      showSuccess('Abonnement résilié — le client garde un accès en consultation')
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
            <CircleSlash className="h-5 w-5 text-amber-600" aria-hidden="true" />
            <AlertDialogTitle>Résilier l&apos;abonnement</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Vous êtes sur le point de résilier l&apos;abonnement de{' '}
            <strong>{clientName}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
            <h4 className="mb-2 text-sm font-semibold">Ce qu&apos;il garde :</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Son espace Lab en consultation (parcours et historique complets)</li>
              <li>• Ses documents, toujours téléchargeables</li>
              <li>• Le chat avec vous et le support, pleinement actifs</li>
              <li>• Ses notifications, la visio, Élio et le suivi de l&apos;outil</li>
            </ul>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
            <h4 className="mb-2 text-sm font-semibold">Ce qu&apos;il perd :</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Les modules de pilotage de son outil (facturation…)</li>
              <li>• Toute action sur son parcours : soumission, génération de document, avancement d&apos;étape</li>
            </ul>
          </div>

          <p className="text-sm text-muted-foreground">
            Réversible à tout moment : le bouton « Réactiver l&apos;abonnement » lui rend
            l&apos;accès complet, sans rien perdre de sa configuration.
          </p>

          <div className="space-y-2">
            <label htmlFor="cancel-reason" className="text-sm font-medium">
              Raison (optionnel)
            </label>
            <Textarea
              id="cancel-reason"
              placeholder="Ex : fin de mission, demande du client, budget..."
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
          <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
            {isPending ? 'Résiliation...' : 'Résilier l’abonnement'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
