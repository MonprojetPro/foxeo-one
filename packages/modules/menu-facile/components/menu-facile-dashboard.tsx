'use client'

import { useState } from 'react'
import { MetricsTab } from './metrics-tab'
import { ModerationTab } from './moderation-tab'
import { RecipesTab } from './recipes-tab'
import { MessagesTab } from './messages-tab'

type TabKey = 'metrics' | 'moderation' | 'recipes' | 'messages'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'metrics', label: 'Tableau de bord' },
  { key: 'moderation', label: 'Modération' },
  { key: 'recipes', label: 'Recettes officielles' },
  { key: 'messages', label: 'Messages' },
]

/**
 * Cockpit MenuFacile — page unique à onglets (Tableau de bord / Modération / Recettes).
 * Toute la donnée passe par les Server Actions → guichet admin-api de MenuFacile.
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
      {tab === 'metrics' && <MetricsTab onNavigate={setTab} />}
      {tab === 'moderation' && <ModerationTab />}
      {tab === 'recipes' && <RecipesTab />}
      {tab === 'messages' && <MessagesTab />}
    </div>
  )
}
