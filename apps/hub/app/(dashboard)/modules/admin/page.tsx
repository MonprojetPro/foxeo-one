'use client'

import { useState } from 'react'
import { ActivityLogs, MaintenanceMode, SystemHealth } from '@foxeo/module-admin'

type AdminTab = 'logs' | 'maintenance' | 'backups' | 'webhooks' | 'monitoring'

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'logs', label: "Logs d'activité" },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'backups', label: 'Backups' },
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'monitoring', label: 'Monitoring' },
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('logs')

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
        {activeTab === 'logs' && <ActivityLogs />}
        {activeTab === 'maintenance' && <MaintenanceMode />}
        {activeTab === 'backups' && (
          <div className="rounded bg-white/5 border border-white/10 px-6 py-8 text-center text-sm text-gray-500">
            Module Backups — disponible Story 12.2
          </div>
        )}
        {activeTab === 'webhooks' && (
          <div className="rounded bg-white/5 border border-white/10 px-6 py-8 text-center text-sm text-gray-500">
            Module Webhooks — disponible Story 12.5b
          </div>
        )}
        {activeTab === 'monitoring' && <SystemHealth />}
      </div>
    </div>
  )
}
