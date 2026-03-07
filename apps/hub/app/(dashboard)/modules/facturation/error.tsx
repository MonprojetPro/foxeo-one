'use client'

import { ErrorDisplay } from '@foxeo/ui'

export default function FacturationError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorDisplay
      title="Erreur du module Facturation"
      message={error.message}
      onRetry={reset}
    />
  )
}
