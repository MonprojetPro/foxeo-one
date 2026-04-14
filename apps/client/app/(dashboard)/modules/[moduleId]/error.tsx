'use client'

import { ErrorDisplay } from '@monprojetpro/ui'

export default function ModuleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorDisplay
      title="Erreur de chargement du module"
      message={error.message}
      onRetry={reset}
    />
  )
}
