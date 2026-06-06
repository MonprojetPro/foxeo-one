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
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
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
                  ✅ <strong>Élio activé :</strong> l'assistant IA pourra vous
                  accompagner dans votre parcours entrepreneurial.
                </span>
              ) : (
                <span>
                  ⚠️ <strong>Élio en veille :</strong> aucune de vos données ne
                  sera traitée par l'IA. Le chat, la génération de brouillons et
                  les suggestions seront indisponibles. Vous gardez l'accès à
                  toute la plateforme.
                </span>
              )}
            </AlertDescription>
          </Alert>

          {/* Transparence — ce que ça implique réellement */}
          <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-4 text-sm">
            <p className="font-medium">Avant d'activer, ce que ça implique :</p>
            <p className="text-muted-foreground">
              Pour fonctionner, Élio confie vos échanges à un moteur d'IA externe :{' '}
              <strong>Claude, développé par la société Anthropic (États-Unis)</strong>.
            </p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>
                🌍 <strong>Vos messages quittent l'Europe</strong> le temps d'être
                traités par Claude aux États-Unis, puis la réponse vous revient
                (transfert encadré par le RGPD).
              </li>
              <li>
                🔒 <strong>Vos données ne servent jamais à entraîner l'IA.</strong>
              </li>
              <li>
                🔐 <strong>Tout est chiffré</strong>, en transit comme au stockage.
              </li>
              <li>
                👁️ <strong>Élio voit</strong> : vos messages avec lui, les documents
                que vous lui partagez, vos préférences de communication.
              </li>
              <li>
                🙈 <strong>Élio ne voit pas</strong> : vos identifiants, vos
                coordonnées bancaires, ni vos échanges privés avec MiKL.
              </li>
            </ul>
          </div>

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
                J'ai compris et j'autorise Élio à traiter mes données via Claude
                (Anthropic, États-Unis)
              </label>
              <p className="text-sm text-muted-foreground">
                C'est 100 % votre choix : vous pouvez refuser maintenant et activer
                plus tard, ou couper Élio à tout moment depuis cette page.
              </p>
            </div>
          </div>

          {/* Additional Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              • Votre choix est appliqué immédiatement et tracé conformément au RGPD.
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
