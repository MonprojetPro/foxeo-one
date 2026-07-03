'use client'

import { useState } from 'react'
import { ClientsOneList, CatalogList, CatalogAnalyticsWidgets } from '@monprojetpro/module-admin'

// Vision One v2 (2026-06-24) : le Hub ne provisionne plus d'« instances » (abandonné).
// Il pilote des CLIENTS One (offre, cycle chantier → livré, modules) et le catalogue
// FORGE des briques réutilisables.
type AdminTab = 'clients-one' | 'catalog' | 'catalog-analytics'

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'clients-one', label: 'Clients One' },
  { id: 'catalog', label: 'Catalogue modules' },
  { id: 'catalog-analytics', label: 'Analytics catalogue' },
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('clients-one')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">One — Clients &amp; Catalogue</h1>
        <p className="text-sm text-gray-400">
          Pilotage des clients One (offre, chantier → livré, modules) et catalogue FORGE des briques
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'clients-one' && <ClientsOneList />}
        {activeTab === 'catalog' && <CatalogList />}
        {activeTab === 'catalog-analytics' && <CatalogAnalyticsWidgets />}
      </div>
    </div>
  )
}
