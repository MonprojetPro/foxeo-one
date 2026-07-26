'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, showSuccess, showError } from '@monprojetpro/ui'
import { Pause, Play, Lock, ArrowUpCircle, CircleSlash, RotateCcw } from 'lucide-react'
import type { Client } from '../types/crm.types'
import { isCancelledSubscription } from '../types/crm.types'
import { SuspendClientDialog } from './suspend-client-dialog'
import { CloseClientDialog } from './close-client-dialog'
import { UpgradeClientDialog } from './upgrade-client-dialog'
import { CancelSubscriptionDialog } from './cancel-subscription-dialog'
import { reactivateClient } from '../actions/reactivate-client'
import { reactivateSubscription } from '../actions/cancel-subscription'

interface ClientLifecycleActionsProps {
  client: Client
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function ClientLifecycleActions({
  client,
  variant = 'outline',
  size = 'default',
}: ClientLifecycleActionsProps) {
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false)
  const [cancelSubDialogOpen, setCancelSubDialogOpen] = useState(false)
  const [upgradeMode, setUpgradeMode] = useState<'lab' | 'one'>('lab')
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const isPonctuel = client.clientType === 'ponctuel'

  const openUpgradeDialog = (mode: 'lab' | 'one') => {
    setUpgradeMode(mode)
    setUpgradeDialogOpen(true)
  }

  const handleReactivate = () => {
    startTransition(async () => {
      const result = await reactivateClient({ clientId: client.id })

      if (result.error) {
        showError(result.error.message)
        return
      }

      showSuccess('Client réactivé')
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
      await queryClient.invalidateQueries({ queryKey: ['client', client.id] })
    })
  }

  const handleReactivateSubscription = () => {
    startTransition(async () => {
      const result = await reactivateSubscription({ clientId: client.id })

      if (result.error) {
        showError(result.error.message)
        return
      }

      showSuccess('Abonnement réactivé — le client retrouve son accès complet')
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
      await queryClient.invalidateQueries({ queryKey: ['client', client.id] })
    })
  }

  // Fin d'abonnement — le client garde un accès dégradé, la seule action utile est de
  // lui rendre son accès complet. Placé AVANT les autres branches : ces statuts ne sont
  // ni 'active' ni 'suspended'.
  if (isCancelledSubscription(client.status)) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleReactivateSubscription}
        disabled={isPending}
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        {isPending ? 'Réactivation...' : 'Réactiver l’abonnement'}
      </Button>
    )
  }

  if (client.status === 'active') {
    return (
      <>
        {isPonctuel && (
          <>
            <Button
              variant={variant}
              size={size}
              onClick={() => openUpgradeDialog('lab')}
              disabled={isPending}
            >
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Upgrader vers Lab
            </Button>
            <Button
              variant={variant}
              size={size}
              onClick={() => openUpgradeDialog('one')}
              disabled={isPending}
            >
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Upgrader vers One
            </Button>
          </>
        )}
        <Button
          variant={variant}
          size={size}
          onClick={() => setSuspendDialogOpen(true)}
          disabled={isPending}
        >
          <Pause className="h-4 w-4 mr-2" />
          Suspendre
        </Button>
        <Button
          variant={variant}
          size={size}
          onClick={() => setCancelSubDialogOpen(true)}
          disabled={isPending}
        >
          <CircleSlash className="h-4 w-4 mr-2" />
          Résilier l’abonnement
        </Button>
        <Button
          variant="destructive"
          size={size}
          onClick={() => setCloseDialogOpen(true)}
          disabled={isPending}
        >
          <Lock className="h-4 w-4 mr-2" />
          Clôturer
        </Button>
        <CancelSubscriptionDialog
          clientId={client.id}
          clientName={client.name}
          open={cancelSubDialogOpen}
          onOpenChange={setCancelSubDialogOpen}
        />
        {isPonctuel && (
          <UpgradeClientDialog
            clientId={client.id}
            open={upgradeDialogOpen}
            onOpenChange={setUpgradeDialogOpen}
            defaultMode={upgradeMode}
          />
        )}
        <SuspendClientDialog
          clientId={client.id}
          clientName={client.name}
          open={suspendDialogOpen}
          onOpenChange={setSuspendDialogOpen}
        />
        <CloseClientDialog
          clientId={client.id}
          clientName={client.name}
          open={closeDialogOpen}
          onOpenChange={setCloseDialogOpen}
        />
      </>
    )
  }

  if (client.status === 'suspended') {
    return (
      <>
        <Button
          variant={variant}
          size={size}
          onClick={handleReactivate}
          disabled={isPending}
        >
          <Play className="h-4 w-4 mr-2" />
          {isPending ? 'Réactivation...' : 'Réactiver'}
        </Button>
        <Button
          variant="destructive"
          size={size}
          onClick={() => setCloseDialogOpen(true)}
          disabled={isPending}
        >
          <Lock className="h-4 w-4 mr-2" />
          Clôturer
        </Button>
        <CloseClientDialog
          clientId={client.id}
          clientName={client.name}
          open={closeDialogOpen}
          onOpenChange={setCloseDialogOpen}
        />
      </>
    )
  }

  if (client.status === 'archived') {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleReactivate}
        disabled={isPending}
      >
        <Play className="h-4 w-4 mr-2" />
        {isPending ? 'Réactivation...' : 'Réactiver'}
      </Button>
    )
  }

  return null
}
