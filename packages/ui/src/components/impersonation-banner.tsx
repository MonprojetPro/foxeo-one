'use client'

import { useState } from 'react'
import { Shield, X } from 'lucide-react'

interface ImpersonationBannerProps {
  sessionId: string
  onEndSession: () => void
}

export function ImpersonationBanner({ sessionId, onEndSession }: ImpersonationBannerProps) {
  const [ending, setEnding] = useState(false)

  const handleEnd = async () => {
    setEnding(true)
    try {
      onEndSession()
    } catch {
      setEnding(false)
    }
  }

  return (
    <div role="alert" aria-live="assertive" className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-red-600 px-4 py-2 text-white shadow-md">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Shield className="h-4 w-4 shrink-0" />
        <span>Session support MiKL en cours — toutes les actions sont enregistrées</span>
      </div>
      <button
        onClick={handleEnd}
        disabled={ending}
        className="flex items-center gap-1.5 rounded-md bg-white/20 px-3 py-1 text-sm font-medium transition-colors hover:bg-white/30 disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" />
        {ending ? 'Fermeture...' : 'Fermer la session'}
      </button>
    </div>
  )
}
