'use client'

import { ErrorDisplay } from '@monprojetpro/ui'

export default function ElioAdvancedSettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="max-w-3xl">
      <ErrorDisplay
        title="Erreur de chargement"
        message="Impossible de charger la configuration Élio avancée."
        error={error}
        onRetry={reset}
      />
    </div>
  )
}
