'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Textarea,
  showSuccess,
  showError,
} from '@monprojetpro/ui'
import { approveRequest } from '../actions/approve-request'
import type { ValidationRequestType } from '../types/validation.types'

type ApproveDialogProps = {
  open: boolean
  onClose: () => void
  requestId: string
  clientId: string
  title: string
  clientName: string
  type: ValidationRequestType
}

export function ApproveDialog({
  open,
  onClose,
  requestId,
  clientId,
  title,
  clientName,
  type,
}: ApproveDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const comment = (formData.get('comment') as string) || undefined

    startTransition(async () => {
      const result = await approveRequest(requestId, comment)

      if (result.error) {
        showError('Erreur lors du traitement — veuillez réessayer')
        return
      }

      showSuccess('Demande validée avec succès')

      await queryClient.invalidateQueries({ queryKey: ['validation-requests'] })
      await queryClient.invalidateQueries({ queryKey: ['validation-request', requestId] })

      if (type === 'brief_lab') {
        await queryClient.invalidateQueries({ queryKey: ['parcours', clientId] })
      }

      onClose()
      router.push('/modules/validation-hub')
      router.refresh()
    })
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen && !isPending) {
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Valider la demande</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="rounded-md bg-muted/30 p-3 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Demande :</span>{' '}
                <strong className="text-foreground">{title}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Client :</span>{' '}
                <span className="text-foreground">{clientName}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Type :</span>{' '}
                <span className="text-foreground">
                  {type === 'brief_lab' ? 'Brief Lab' : 'Évolution One'}
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="approve-comment" className="text-sm font-medium text-foreground">
                Commentaire{' '}
                <span className="text-muted-foreground font-normal">(optionnel)</span>
              </label>
              <Textarea
                id="approve-comment"
                name="comment"
                placeholder="Commentaire pour le client (optionnel)"
                maxLength={500}
                disabled={isPending}
                className="resize-none"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isPending ? 'Validation en cours...' : 'Confirmer la validation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
