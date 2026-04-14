'use client'

import { ErrorDisplay } from '@monprojetpro/ui'

export default function CRMError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorDisplay
      title="Erreur du module CRM"
      message={error.message}
      onRetry={reset}
    />
  )
}
