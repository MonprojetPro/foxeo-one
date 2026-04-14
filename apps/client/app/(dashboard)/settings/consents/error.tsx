'use client'

import { ErrorDisplay } from '@monprojetpro/ui'

export default function ConsentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestion des consentements</h1>
        <p className="text-muted-foreground mt-2">
          Une erreur s'est produite lors du chargement de vos consentements.
        </p>
      </div>

      <ErrorDisplay
        title="Erreur de chargement"
        message={
          error.message ||
          'Impossible de charger vos consentements. Veuillez réessayer.'
        }
        onRetry={reset}
      />
    </div>
  )
}
