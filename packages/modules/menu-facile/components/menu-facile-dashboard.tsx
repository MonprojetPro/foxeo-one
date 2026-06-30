'use client'

import { useState } from 'react'
import { MetricsTab } from './metrics-tab'

type TabKey = 'metrics' | 'moderation' | 'recipes'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'metrics', label: 'Tableau de bord' },
  { key: 'moderation', label: 'Modération' },
  { key: 'recipes', label: 'Recettes officielles' },
]

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
      <p className="text-sm text-gray-300">{title}</p>
      <p className="text-xs text-gray-500 mt-1">Écran en cours de construction — étape suivante.</p>
    </div>
  )
}

/**
 * Cockpit MenuFacile — page unique à onglets (Tableau de bord / Modération / Recettes).
 * Pour l'instant seul « Tableau de bord » est branché (GET /metrics) ; les deux
 * autres onglets sont des placeholders en attendant l'étape 2.
 */
export function MenuFacileDashboard() {
  const [tab, setTab] = useState<TabKey>('metrics')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">MenuFacile</h1>
        <p className="text-sm text-gray-400">
          Cockpit d&apos;administration du produit — piloté via le guichet sécurisé
        </p>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-white/10">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${
              tab === t.key
                ? 'border-cyan-400 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {tab === 'metrics' && <MetricsTab />}
      {tab === 'moderation' && <ComingSoon title="Modération des signalements" />}
      {tab === 'recipes' && <ComingSoon title="Gestion des recettes officielles" />}
    </div>
  )
}
