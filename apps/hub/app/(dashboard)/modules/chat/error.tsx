'use client'

import { ErrorDisplay } from '@monprojetpro/ui'

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorDisplay
      title="Erreur du module Chat"
      message={error.message}
      onRetry={reset}
    />
  )
}
