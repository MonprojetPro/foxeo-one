'use client'

import { AlertCircle } from 'lucide-react'
import { Button } from '@monprojetpro/ui'
import { CockpitCallout } from '@monprojetpro/ui'

export default function RequestDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Bandeau d'erreur cockpit */}
      <CockpitCallout tone="red" icon={AlertCircle} title="Une erreur est survenue">
        {error.message}
      </CockpitCallout>
      <div>
        <Button
          variant="outline"
          onClick={reset}
          className="border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/20 hover:text-gray-200"
        >
          Réessayer
        </Button>
      </div>
    </div>
  )
}
