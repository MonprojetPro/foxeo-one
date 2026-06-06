'use client'

import { Button, Alert, AlertDescription } from '@monprojetpro/ui'
import { useState } from 'react'
import { submitIaReconsentAction } from './actions'
import { toast } from 'sonner'

export default function IaConsentUpdatePage() {
  const [isLoading, setIsLoading] = useState<'accept' | 'refuse' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleChoice(accepted: boolean) {
    setIsLoading(accepted ? 'accept' : 'refuse')
    setError(null)

    const result = await submitIaReconsentAction(accepted)

    if (result.error) {
      setError(result.error.message)
      setIsLoading(null)
      toast.error(result.error.message)
    } else {
      toast.success(
        accepted
          ? 'Élio est activé'
          : 'Choix enregistré — Élio reste en veille'
      )
      // Hard navigation pour relire le consentement à jour côté middleware
      window.location.href = '/'
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">
            Notre politique de traitement par l&apos;IA a évolué
          </h1>
          <p className="text-muted-foreground">
            Avant de continuer, nous vous redemandons votre choix concernant
            l&apos;assistant Élio.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Ce qui a changé</h2>
            <p className="text-sm text-muted-foreground">
              Pour fonctionner, Élio confie désormais vos échanges à{' '}
              <strong>Claude, développé par la société Anthropic (États-Unis)</strong>.
            </p>
          </div>

          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>
              🌍 <strong>Vos messages quittent l&apos;Europe</strong> le temps
              d&apos;être traités par Claude aux États-Unis (transfert encadré par
              le RGPD).
            </li>
            <li>
              🔒 <strong>Vos données ne servent jamais à entraîner l&apos;IA.</strong>
            </li>
            <li>
              🔐 <strong>Tout est chiffré</strong>, en transit comme au stockage.
            </li>
            <li>
              👁️ <strong>Élio voit</strong> : vos messages, les documents que vous
              partagez, vos préférences. Il ne voit pas vos identifiants, vos
              coordonnées bancaires, ni vos échanges privés avec MiKL.
            </li>
          </ul>

          <div className="flex justify-center pt-2">
            <a
              href="/legal/ia-processing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline transition-colors hover:text-primary/80"
            >
              Consulter la politique IA complète
            </a>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => handleChoice(true)}
            disabled={isLoading !== null}
            className="w-full"
            size="lg"
          >
            {isLoading === 'accept'
              ? 'Enregistrement…'
              : 'J\'accepte — activer Élio'}
          </Button>

          <Button
            onClick={() => handleChoice(false)}
            disabled={isLoading !== null}
            variant="outline"
            className="w-full"
            size="lg"
          >
            {isLoading === 'refuse'
              ? 'Enregistrement…'
              : 'Je refuse — garder Élio en veille'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Vous pourrez modifier ce choix à tout moment depuis Paramètres →
            Consentements. Sans Élio, vous gardez l&apos;accès à toute la plateforme.
          </p>
        </div>
      </div>
    </div>
  )
}
