'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  showSuccess,
  showError,
} from '@monprojetpro/ui'
import { deferClient } from '../actions/defer-client'

interface DeferDialogProps {
  clientId: string
  currentDeferredUntil: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeferDialog({ clientId, currentDeferredUntil, open, onOpenChange }: DeferDialogProps) {
  const [deferDate, setDeferDate] = useState('')
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const handleDefer = () => {
    if (!deferDate) return

    startTransition(async () => {
      const result = await deferClient({
        clientId,
        deferredUntil: new Date(deferDate + 'T12:00:00').toISOString(),
      })

      if (result.error) {
        showError(result.error.message)
        return
      }

      showSuccess('Client reporté')
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
      onOpenChange(false)
      setDeferDate('')
    })
  }

  const handleClearDefer = () => {
    startTransition(async () => {
      const result = await deferClient({
        clientId,
        deferredUntil: null,
      })

      if (result.error) {
        showError(result.error.message)
        return
      }

      showSuccess('Report annulé')
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
      onOpenChange(false)
    })
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setDeferDate('')
    }
    onOpenChange(isOpen)
  }

  // Minimum date is tomorrow
  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>À traiter plus tard</DialogTitle>
          <DialogDescription>
            Choisissez une date de rappel. L&apos;indicateur &quot;Reporté&quot; disparaîtra automatiquement après cette date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="defer-date" className="text-sm font-medium">
              Date de rappel
            </label>
            <Input
              id="defer-date"
              type="date"
              min={minDateStr}
              value={deferDate}
              onChange={(e) => setDeferDate(e.target.value)}
              data-testid="defer-date-input"
            />
          </div>
        </div>

        <DialogFooter>
          {currentDeferredUntil && (
            <Button
              variant="outline"
              onClick={handleClearDefer}
              disabled={isPending}
              data-testid="clear-defer-btn"
            >
              Annuler le report
            </Button>
          )}
          <Button variant="outline" onClick={() => handleClose(false)}>
            Fermer
          </Button>
          <Button
            onClick={handleDefer}
            disabled={!deferDate || isPending}
            data-testid="confirm-defer-btn"
          >
            {isPending ? 'Validation...' : 'Valider'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
