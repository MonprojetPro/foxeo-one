'use client'

import { ErrorDisplay } from '@monprojetpro/ui'

export default function FacturationError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorDisplay
      title="Erreur du module Comptabilité"
      message={error.message}
      onRetry={reset}
    />
  )
}
