'use client'

import { ErrorDisplay } from '@monprojetpro/ui'

export default function MeetingRoomClientError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorDisplay
      title="Erreur — Salle de visio"
      message={error.message}
      onRetry={reset}
    />
  )
}
