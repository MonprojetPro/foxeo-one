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
  Badge,
  Separator,
  showSuccess,
  showError,
} from '@monprojetpro/ui'
import { startHandoff } from '../actions/start-handoff'
import type { StartHandoffInput } from '../actions/start-handoff'

interface HandoffDialogProps {
  clientId: string
  clientName: string
  clientCompany: string
  clientStatus: string
  activeModules: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

type HandoffType = 'subscription_cancelled' | 'one_shot'

export function HandoffDialog({
  clientId,
  clientName,
  clientCompany,
  clientStatus,
  activeModules,
  open,
  onOpenChange,
}: HandoffDialogProps) {
  const [handoffType, setHandoffType] = useState<HandoffType>(
    clientStatus === 'subscription_cancelled' ? 'subscription_cancelled' : 'one_shot'
  )
  const [slug, setSlug] = useState(
    clientCompany.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  )
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const handleConfirm = () => {
    startTransition(async () => {
      const input: StartHandoffInput = {
        clientId,
        handoffType,
        slug,
      }

      const result = await startHandoff(input)

      if (result.error) {
        showError(result.error.message)
        return
      }

      showSuccess(`Kit de sortie lancé pour ${clientName} (ID: ${result.data!.handoffId.slice(0, 8)})`)
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
      await queryClient.invalidateQueries({ queryKey: ['client', clientId] })
      onOpenChange(false)
    })
  }

  const handoffTypeLabels: Record<HandoffType, string> = {
    subscription_cancelled: 'Résiliation d\'abonnement',
    one_shot: 'Livraison one-shot',
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Lancer le kit de sortie</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action va provisionner un déploiement standalone (Vercel + GitHub + Supabase)
            pour le client et migrer ses données.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Récap client */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Client</span>
              <span className="text-sm font-medium">{clientName} — {clientCompany}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Modules actifs</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {activeModules.length > 0 ? (
                  activeModules.map((mod) => (
                    <Badge key={mod} variant="secondary" className="text-xs">{mod}</Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">Aucun</span>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Type de sortie */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Type de sortie</span>
            <div className="flex gap-2">
              {(Object.entries(handoffTypeLabels) as [HandoffType, string][]).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  className={[
                    'px-3 py-2 rounded-md text-sm border transition-colors',
                    handoffType === type
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50',
                  ].join(' ')}
                  onClick={() => setHandoffType(type)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Slug */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Slug du projet</span>
              <span className="text-xs text-muted-foreground">monprojetpro-{slug}</span>
            </div>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
              placeholder="nom-du-client"
              data-testid="handoff-slug-input"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending || !slug}
            data-testid="confirm-handoff-button"
          >
            {isPending ? 'Lancement…' : 'Confirmer le kit de sortie'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
