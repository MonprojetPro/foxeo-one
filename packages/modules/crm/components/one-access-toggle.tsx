'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Switch,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  showSuccess,
  showError,
} from '@monprojetpro/ui'
import { toggleAccess } from '../actions/toggle-access'

interface OneAccessToggleProps {
  clientId: string
  /** one_mode_available — l'accès One est ouvert. */
  oneModeAvailable: boolean
}

/**
 * Switch « Accès One » (levier one_mode_available) + confirmation à la fermeture.
 * Seul endroit qui pilote ce levier : le panneau « Dashboard One » du cockpit Pilote.
 */
export function OneAccessToggle({ clientId, oneModeAvailable }: OneAccessToggleProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const executeToggle = (enabled: boolean) => {
    startTransition(async () => {
      const result = await toggleAccess({ clientId, accessType: 'one', enabled })

      if (result.error) {
        showError(result.error.message)
        return
      }

      showSuccess(`Accès One ${enabled ? 'activé' : 'désactivé'}`)

      if (result.data?.labAutoPaused) {
        showSuccess('Le Lab a été mis en pause automatiquement (One déclenché) — réactive les agents si besoin')
      }

      await queryClient.invalidateQueries({ queryKey: ['client', clientId] })
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
      await queryClient.invalidateQueries({ queryKey: ['client-parcours', clientId] })
    })
  }

  const handleToggle = (enabled: boolean) => {
    // À la fermeture, on confirme (le client perd l'accès à son dashboard One).
    if (!enabled) {
      setConfirmOpen(true)
      return
    }
    executeToggle(true)
  }

  return (
    <>
      <Switch
        checked={oneModeAvailable}
        onCheckedChange={handleToggle}
        disabled={isPending}
        aria-label="Activer l'accès One"
        data-testid="toggle-one"
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Désactiver l&apos;accès One</DialogTitle>
            <DialogDescription>
              Le client perdra l&apos;accès à son dashboard One. Son espace Lab et son historique
              restent accessibles.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                executeToggle(false)
                setConfirmOpen(false)
              }}
              disabled={isPending}
            >
              {isPending ? 'Désactivation...' : 'Confirmer la désactivation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
