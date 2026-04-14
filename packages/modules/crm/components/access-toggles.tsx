'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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

interface AccessTogglesProps {
  clientId: string
  dashboardType: string
  hasActiveParcours: boolean
}

export function AccessToggles({ clientId, dashboardType, hasActiveParcours }: AccessTogglesProps) {
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'lab' | 'one'; show: boolean }>({ type: 'lab', show: false })
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  // Lab ON = dashboardType 'lab' (Lab implies both accesses active, Lab is the priority)
  // One ON = dashboardType 'one' OR 'lab' (One is always accessible when Lab is active)
  const labEnabled = dashboardType === 'lab'
  const oneEnabled = dashboardType === 'one' || dashboardType === 'lab'

  const handleToggle = (accessType: 'lab' | 'one', enabled: boolean) => {
    // If disabling, show confirmation
    if (!enabled) {
      setConfirmDialog({ type: accessType, show: true })
      return
    }

    executeToggle(accessType, enabled)
  }

  const executeToggle = (accessType: 'lab' | 'one', enabled: boolean) => {
    startTransition(async () => {
      const result = await toggleAccess({ clientId, accessType, enabled })

      if (result.error) {
        showError(result.error.message)
        return
      }

      const label = accessType === 'lab' ? 'Lab' : 'One'
      const action = enabled ? 'activé' : 'désactivé'
      showSuccess(`Accès ${label} ${action}`)

      if (result.data?.parcoursSuspended) {
        showSuccess('Le parcours Lab a été suspendu')
      }

      await queryClient.invalidateQueries({ queryKey: ['client', clientId] })
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
      await queryClient.invalidateQueries({ queryKey: ['client-parcours', clientId] })
    })
  }

  const confirmDisable = () => {
    executeToggle(confirmDialog.type, false)
    setConfirmDialog({ type: 'lab', show: false })
  }

  const dashboardLabel = confirmDialog.type === 'lab' ? 'Lab' : 'One'

  return (
    <>
      <Card data-testid="access-toggles">
        <CardHeader>
          <CardTitle>Accès dashboards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Accès Lab</p>
                <p className="text-xs text-muted-foreground">Dashboard d&apos;incubation client</p>
              </div>
              <Switch
                checked={labEnabled}
                onCheckedChange={(checked: boolean) => handleToggle('lab', checked)}
                disabled={isPending}
                aria-label="Activer l'accès Lab"
                data-testid="toggle-lab"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Accès One</p>
                <p className="text-xs text-muted-foreground">Dashboard business client</p>
              </div>
              <Switch
                checked={oneEnabled}
                onCheckedChange={(checked: boolean) => handleToggle('one', checked)}
                disabled={isPending}
                aria-label="Activer l'accès One"
                data-testid="toggle-one"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation dialog for disabling access */}
      <Dialog open={confirmDialog.show} onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, show: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Désactiver l&apos;accès {dashboardLabel}</DialogTitle>
            <DialogDescription>
              Le client perdra l&apos;accès à son dashboard {dashboardLabel}.
              {confirmDialog.type === 'lab' && hasActiveParcours && (
                <> Le parcours Lab en cours sera suspendu (pas supprimé).</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ type: 'lab', show: false })}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmDisable} disabled={isPending}>
              {isPending ? 'Désactivation...' : 'Confirmer la désactivation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
