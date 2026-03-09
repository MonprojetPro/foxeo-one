'use client'

import { Badge } from '@foxeo/ui'

export function WebhooksPlaceholder() {
  return (
    <div className="rounded bg-white/5 border border-white/10 px-8 py-12 flex flex-col items-center gap-4 text-center max-w-lg mx-auto">
      <div className="text-4xl" aria-hidden="true">🔗</div>
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-white">Webhooks sortants</h2>
        <Badge variant="outline" className="text-amber-500 border-amber-500">Phase 2</Badge>
      </div>
      <p className="text-sm text-gray-400">
        Configurez des webhooks sortants pour intégrer Foxeo avec vos outils (Slack, Zapier, Make...).
        Cette fonctionnalité sera disponible en Phase 2.
      </p>
    </div>
  )
}
