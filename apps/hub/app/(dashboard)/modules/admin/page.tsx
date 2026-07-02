'use client'

import { useState } from 'react'
import { InstancesList, CatalogList, CatalogAnalyticsWidgets } from '@monprojetpro/module-admin'

type AdminTab = 'catalog' | 'catalog-analytics' | 'instances'

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'catalog', label: 'Catalogue modules' },
  { id: 'catalog-analytics', label: 'Analytics catalogue' },
  { id: 'instances', label: 'Instances One' },
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('instances')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Instances &amp; Catalogue</h1>
        <p className="text-sm text-gray-400">Provisioning des instances One et catalogue des modules</p>
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
        {activeTab === 'catalog' && <CatalogList />}
        {activeTab === 'catalog-analytics' && <CatalogAnalyticsWidgets />}
        {activeTab === 'instances' && <InstancesList />}
      </div>
    </div>
  )
}
