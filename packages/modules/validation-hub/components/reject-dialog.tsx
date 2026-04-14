'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { rejectRequest } from '../actions/reject-request'
import type { ValidationRequestType } from '../types/validation.types'

const rejectSchema = z.object({
  comment: z
    .string()
    .min(10, 'Le commentaire doit contenir au moins 10 caractères')
    .max(500, 'Le commentaire ne doit pas dépasser 500 caractères'),
})

type RejectFormData = z.infer<typeof rejectSchema>

type RejectDialogProps = {
  open: boolean
  onClose: () => void
  requestId: string
  clientId: string
  title: string
  clientName: string
  type: ValidationRequestType
}

export function RejectDialog({
  open,
  onClose,
  requestId,
  clientId,
  title,
  clientName,
  type,
}: RejectDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<RejectFormData>({
    resolver: zodResolver(rejectSchema),
    mode: 'onChange',
  })

  function handleClose() {
    if (isPending) return
    reset()
    onClose()
  }

  function onSubmit(data: RejectFormData) {
    startTransition(async () => {
      const result = await rejectRequest(requestId, data.comment)

      if (result.error) {
        showError('Erreur lors du traitement — veuillez réessayer')
        return
      }

      showSuccess('Demande refusée — le client a été notifié')

      await queryClient.invalidateQueries({ queryKey: ['validation-requests'] })
      await queryClient.invalidateQueries({ queryKey: ['validation-request', requestId] })

      reset()
      onClose()
      router.push('/modules/validation-hub')
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refuser la demande</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
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
              <label htmlFor="reject-comment" className="text-sm font-medium text-foreground">
                Commentaire <span className="text-red-400">*</span>
              </label>
              <Textarea
                id="reject-comment"
                placeholder="Expliquez au client ce qui doit être modifié..."
                {...register('comment')}
                disabled={isPending}
                className={`resize-none ${errors.comment ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                rows={4}
              />
              {errors.comment && (
                <p className="text-xs text-red-500">{errors.comment.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!isValid || isPending}
            >
              {isPending ? 'Refus en cours...' : 'Confirmer le refus'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
