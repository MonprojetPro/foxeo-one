'use client'

import { ErrorDisplay } from '@monprojetpro/ui'

export default function ClientDocumentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorDisplay
      title="Erreur du module Documents"
      message={error.message}
      onRetry={reset}
    />
  )
}
