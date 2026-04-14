'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
  Checkbox,
  Alert,
  AlertDescription,
} from '@monprojetpro/ui'
import { updateIaConsentAction } from './actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface UpdateIaConsentDialogProps {
  currentConsent: boolean
}

export function UpdateIaConsentDialog({
  currentConsent,
}: UpdateIaConsentDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [newConsent, setNewConsent] = useState(currentConsent)

  async function handleSave() {
    setIsLoading(true)

    const result = await updateIaConsentAction(newConsent)

    if (result.error) {
      toast.error(result.error.message)
      setIsLoading(false)
    } else {
      toast.success(
        newConsent
          ? 'Consentement IA activé — Élio est maintenant disponible'
          : 'Consentement IA révoqué — Élio a été désactivé'
      )
      setOpen(false)
      setIsLoading(false)
      router.refresh()
    }
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    // Reset to current consent when dialog closes
    if (!isOpen) {
      setNewConsent(currentConsent)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Modifier mon consentement IA</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier le consentement IA</DialogTitle>
          <DialogDescription>
            Gérez l'autorisation de traitement de vos données par
            l'intelligence artificielle Élio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Impact Alert */}
          <Alert>
            <AlertDescription>
              {newConsent ? (
                <span>
                  ✅ <strong>Élio activé :</strong> L'assistant IA pourra vous
                  accompagner dans votre parcours entrepreneurial.
                </span>
              ) : (
                <span>
                  ⚠️ <strong>Élio désactivé :</strong> Vous ne pourrez plus
                  utiliser les fonctionnalités IA (chat, génération de briefs,
                  suggestions).
                </span>
              )}
            </AlertDescription>
          </Alert>

          {/* Checkbox */}
          <div className="flex items-start space-x-3 rounded-lg border border-border p-4">
            <Checkbox
              id="ia-consent"
              checked={newConsent}
              onCheckedChange={(checked) =>
                setNewConsent(checked as boolean)
              }
            />
            <div className="space-y-1">
              <label
                htmlFor="ia-consent"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                J'accepte le traitement de mes données par l'IA Élio
              </label>
              <p className="text-sm text-muted-foreground">
                Élio pourra accéder à vos messages, documents partagés et profil
                de communication pour vous offrir une assistance personnalisée.
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              • Vous pouvez modifier ce choix à tout moment depuis cette page.
            </p>
            <p>
              • La modification est immédiate et tracée conformément au RGPD.
            </p>
            <p>
              •{' '}
              <a
                href="/legal/ia-processing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Consulter la politique IA complète
              </a>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
