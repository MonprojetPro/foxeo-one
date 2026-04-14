'use client'

import { Button, Alert, AlertDescription } from '@monprojetpro/ui'
import { useState } from 'react'
import { updateCguConsentAction } from './actions'
import { toast } from 'sonner'

export default function ConsentUpdatePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept() {
    setIsLoading(true)
    setError(null)

    const result = await updateCguConsentAction()

    if (result.error) {
      setError(result.error.message)
      setIsLoading(false)
      toast.error(result.error.message)
    } else {
      toast.success('CGU acceptées')
      // Redirect to dashboard
      window.location.href = '/'
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">
            Mise à jour de nos Conditions Générales d'Utilisation
          </h1>
          <p className="text-muted-foreground">
            Pour continuer à utiliser MonprojetPro, veuillez accepter la nouvelle
            version de nos CGU.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Qu'est-ce qui a changé ?</h2>
            <p className="text-sm text-muted-foreground">
              Nos CGU ont été mises à jour pour mieux refléter les nouvelles
              fonctionnalités de la plateforme et pour renforcer la protection
              de vos données.
            </p>
          </div>

          <div className="flex justify-center">
            <a
              href="/legal/cgu"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary/80 transition-colors"
            >
              Consulter les nouvelles CGU
            </a>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleAccept}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading
              ? 'Enregistrement en cours...'
              : 'J\'accepte les nouvelles CGU'}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            En acceptant, vous confirmez avoir lu et compris les nouvelles
            Conditions Générales d'Utilisation.
          </p>
        </div>
      </div>
    </div>
  )
}
