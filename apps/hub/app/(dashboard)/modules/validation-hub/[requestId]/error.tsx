'use client'

import { AlertCircle } from 'lucide-react'
import { Button } from '@monprojetpro/ui'

export default function RequestDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center p-6">
      <div className="p-4 rounded-full bg-red-500/10">
        <AlertCircle className="h-8 w-8 text-red-400" />
      </div>
      <div>
        <p className="text-lg font-medium text-foreground">
          Une erreur est survenue
        </p>
        <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
      </div>
      <Button variant="outline" onClick={reset}>
        Réessayer
      </Button>
    </div>
  )
}
