'use client'

import { ErrorDisplay } from '@monprojetpro/ui'

export default function VisioHubError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorDisplay
      title="Erreur du module Visio"
      message={error.message}
      onRetry={reset}
    />
  )
}
