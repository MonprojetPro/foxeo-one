'use client'

import { KeyRound } from 'lucide-react'
import { Badge } from '@monprojetpro/ui'

export function ApiPlaceholder() {
  return (
    /* Placeholder cockpit — état vide avec pastille d'icône */
    <div className="mx-auto flex max-w-lg flex-col items-center gap-5 rounded-2xl border border-dashed border-white/10 px-8 py-14 text-center">
      {/* Pastille d'icône */}
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
        <KeyRound className="h-6 w-6 text-gray-500" />
      </div>
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-white">API Client</h2>
        <Badge variant="outline" className="border-amber-500/50 text-amber-400">Phase 2</Badge>
      </div>
      <p className="text-sm text-gray-500">
        Générez des clés API pour permettre à vos clients d&apos;intégrer MonprojetPro dans leurs systèmes.
        Cette fonctionnalité sera disponible en Phase 2.
      </p>
    </div>
  )
}
