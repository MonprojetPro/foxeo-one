'use client'

import { ErrorDisplay } from '@monprojetpro/ui'

export default function SettingsBillingError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorDisplay
      title="Erreur"
      message="Impossible de charger vos factures pour le moment."
      onRetry={reset}
    />
  )
}
