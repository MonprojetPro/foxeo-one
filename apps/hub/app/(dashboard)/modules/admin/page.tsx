'use client'

import { useState } from 'react'
import { ActivityLogs, MaintenanceMode, SystemHealth, WebhooksPlaceholder, ApiPlaceholder, InstancesList, CatalogList, CatalogAnalyticsWidgets } from '@monprojetpro/module-admin'

type AdminTab = 'catalog' | 'catalog-analytics' | 'logs' | 'maintenance' | 'backups' | 'webhooks' | 'api' | 'monitoring' | 'instances'

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'catalog', label: 'Catalogue modules' },
  { id: 'catalog-analytics', label: 'Analytics catalogue' },
  { id: 'logs', label: "Logs d'activité" },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'backups', label: 'Backups' },
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'api', label: 'API' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'instances', label: 'Instances One' },
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('catalog')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Administration</h1>
        <p className="text-sm text-gray-400">Gestion système, logs et maintenance</p>
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
        {activeTab === 'logs' && <ActivityLogs />}
        {activeTab === 'maintenance' && <MaintenanceMode />}
        {activeTab === 'backups' && (
          <div className="rounded bg-white/5 border border-white/10 px-6 py-8 text-center text-sm text-gray-500">
            Module Backups — disponible Story 12.2
          </div>
        )}
        {activeTab === 'webhooks' && <WebhooksPlaceholder />}
        {activeTab === 'api' && <ApiPlaceholder />}
        {activeTab === 'monitoring' && <SystemHealth />}
        {activeTab === 'instances' && <InstancesList />}
      </div>
    </div>
  )
}
