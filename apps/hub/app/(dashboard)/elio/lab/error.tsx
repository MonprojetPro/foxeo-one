'use client'

import { AlertCircle } from 'lucide-react'

export default function ElioLabError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Erreur de chargement du catalogue</p>
        <p className="mt-1 text-xs text-muted-foreground">{error.message}</p>
      </div>
      <button
        onClick={reset}
        className="rounded-md bg-muted px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/80"
      >
        Réessayer
      </button>
    </div>
  )
}
