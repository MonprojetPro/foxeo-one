'use client'

import { useState, useTransition } from 'react'
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
import { postponeRequest } from '../actions/postpone-request'

type PostponeDialogProps = {
  open: boolean
  onClose: () => void
  requestId: string
  requestTitle: string
  clientName: string
}

export function PostponeDialog({
  open,
  onClose,
  requestId,
  requestTitle,
  clientName,
}: PostponeDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [reason, setReason] = useState('')
  const [reminderDate, setReminderDate] = useState('')

  function handleClose() {
    if (isPending) return
    setReason('')
    setReminderDate('')
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await postponeRequest(
        requestId,
        requestTitle,
        clientName,
        reason.trim() || undefined,
        reminderDate ? new Date(reminderDate + 'T00:00:00').toISOString() : undefined
      )

      if (result.error) {
        showError('Erreur lors du report — veuillez réessayer')
        return
      }

      showSuccess('Demande reportée')

      await queryClient.invalidateQueries({ queryKey: ['validation-requests'] })
      await queryClient.invalidateQueries({ queryKey: ['validation-request', requestId] })

      handleClose()
      router.push('/modules/validation-hub')
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reporter la demande</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Résumé */}
            <div className="rounded-md bg-muted/30 p-3 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Demande :</span>{' '}
                <strong className="text-foreground">{requestTitle}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Client :</span>{' '}
                <span className="text-foreground">{clientName}</span>
              </p>
            </div>

            {/* Raison (optionnelle) */}
            <div className="space-y-2">
              <label htmlFor="postpone-reason" className="text-sm font-medium text-foreground">
                Raison du report <span className="text-muted-foreground text-xs">(optionnel)</span>
              </label>
              <Textarea
                id="postpone-reason"
                placeholder="Pourquoi reporter cette demande ?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isPending}
                className="resize-none"
                rows={3}
              />
            </div>

            {/* Date de rappel (optionnelle) */}
            <div className="space-y-2">
              <label htmlFor="postpone-date" className="text-sm font-medium text-foreground">
                Date de rappel <span className="text-muted-foreground text-xs">(optionnel)</span>
              </label>
              <input
                id="postpone-date"
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                disabled={isPending}
                min={new Date().toISOString().split('T')[0]}
                className="w-full text-sm bg-card border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
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
              disabled={isPending}
              variant="outline"
              className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 disabled:opacity-50"
            >
              {isPending ? 'Report en cours...' : 'Confirmer le report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
