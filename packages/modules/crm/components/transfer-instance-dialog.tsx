'use client'

/**
 * @deprecated Depuis ADR-01 Révision 2 (2026-04-13).
 * Voir Story 13.1 — Kit de sortie client (Epic 13). Ce dialog sera remplacé
 * par le bouton "Lancer kit de sortie" lors de l'implémentation de Story 13.1.
 */

import { useState, useEffect, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  showSuccess,
  showError,
} from '@monprojetpro/ui'
import { transferInstanceToClient } from '@monprojetpro/module-admin'

interface TransferInstanceDialogProps {
  clientId: string
  clientName: string
  clientEmail: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function TransferInstanceDialog({
  clientId,
  clientName,
  clientEmail,
  open,
  onOpenChange,
  onSuccess,
}: TransferInstanceDialogProps) {
  const [recipientEmail, setRecipientEmail] = useState(clientEmail)
  const [confirmed, setConfirmed] = useState(false)
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setRecipientEmail(clientEmail)
      setConfirmed(false)
    }
  }, [open, clientEmail])

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await transferInstanceToClient({
        clientId,
        recipientEmail,
      })

      if (result.error) {
        showError(result.error.message)
        return
      }

      showSuccess('Transfert lancé — le processus peut prendre 10 à 30 minutes')
      await queryClient.invalidateQueries({ queryKey: ['clients', clientId] })
      onOpenChange(false)
      onSuccess?.()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transférer l&apos;instance One au client</DialogTitle>
          <DialogDescription>
            Transférez l&apos;instance One dédiée de {clientName} avec code source, base de données et documentation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Warning */}
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive font-medium">
              ⚠️ Cette action est irréversible. Le client deviendra propriétaire complet de son instance.
            </p>
            <p className="text-xs text-destructive/80 mt-1">
              L&apos;accès à l&apos;instance MonprojetPro One sera désactivé après le transfert.
            </p>
          </div>

          {/* Checklist pré-transfert */}
          <div>
            <p className="text-sm font-semibold mb-3">Vérifications avant transfert</p>
            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-0.5 w-4 h-4" />
                <span className="text-sm">
                  <span className="font-medium">Factures soldées</span>
                  <span className="text-muted-foreground"> — vérification manuelle</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-0.5 w-4 h-4" />
                <span className="text-sm">
                  <span className="font-medium">Documents stratégiques finalisés</span>
                  <span className="text-muted-foreground"> — brief, PRD, architecture</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-0.5 w-4 h-4" />
                <span className="text-sm">
                  <span className="font-medium">Export RGPD effectué</span>
                  <span className="text-muted-foreground"> — optionnel mais recommandé</span>
                </span>
              </label>
            </div>
          </div>

          {/* Email destinataire */}
          <div>
            <label className="text-sm font-semibold mb-2 block">
              Email destinataire
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              data-testid="recipient-email-input"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="email@exemple.com"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Le package de transfert (code + DB + documentation + guide d&apos;autonomie) sera envoyé à cette adresse.
            </p>
          </div>

          {/* Checkbox confirmation obligatoire */}
          <label className="flex items-start gap-3 cursor-pointer rounded-lg border p-3 hover:bg-muted/50">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              data-testid="confirm-ownership-checkbox"
              className="mt-0.5 w-4 h-4"
            />
            <span className="text-sm font-medium">
              Je confirme que le client est propriétaire de son code et de ses données,
              et que cette action est irréversible.
            </span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              data-testid="cancel-transfer-button"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleConfirm}
              disabled={isPending || !confirmed || !recipientEmail}
              data-testid="confirm-transfer-button"
            >
              {isPending ? 'Transfert en cours…' : 'Confirmer le transfert'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

TransferInstanceDialog.displayName = 'TransferInstanceDialog'
