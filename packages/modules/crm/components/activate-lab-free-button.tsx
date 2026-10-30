'use client'

import { useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, showSuccess, showError } from '@monprojetpro/ui'
import { activateLabFree } from '../actions/activate-lab-free'

interface ActivateLabFreeButtonProps {
  clientId: string
}

// T-067 — Porte d'entrée unique « Déclencher le Lab », option gratuite. Juste à côté de
// l'option payante (LabBillingTab), pour que les deux chemins d'activation vivent au
// même endroit au lieu d'être dispersés dans l'onglet.
export function ActivateLabFreeButton({ clientId }: ActivateLabFreeButtonProps) {
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const handleActivate = () => {
    startTransition(async () => {
      const result = await activateLabFree({ clientId })

      if (result.error) {
        showError(result.error.message)
        return
      }

      showSuccess('Lab activé — le client peut composer son parcours')
      await queryClient.invalidateQueries({ queryKey: ['client', clientId] })
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleActivate}
      disabled={isPending}
      data-testid="activate-lab-free-button"
    >
      {isPending ? 'Activation...' : 'Activer sans facturation'}
    </Button>
  )
}
