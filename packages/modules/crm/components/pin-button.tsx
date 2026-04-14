'use client'

import { useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, showSuccess, showError } from '@monprojetpro/ui'
import { togglePinClient } from '../actions/toggle-pin-client'

interface PinButtonProps {
  clientId: string
  isPinned: boolean
}

export function PinButton({ clientId, isPinned }: PinButtonProps) {
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click navigation

    startTransition(async () => {
      const result = await togglePinClient(clientId, !isPinned)

      if (result.error) {
        showError(result.error.message)
        return
      }

      showSuccess(isPinned ? 'Client désépinglé' : 'Client épinglé')
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
      className={isPinned ? 'text-primary' : 'text-muted-foreground'}
      aria-label={isPinned ? 'Désépingler le client' : 'Épingler le client'}
      data-testid={`pin-btn-${clientId}`}
    >
      {isPinned ? '📌' : '📍'}
    </Button>
  )
}
