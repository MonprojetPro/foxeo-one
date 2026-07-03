'use client'

import { useState } from 'react'
import { ActivityLogs, MaintenanceMode, SystemHealth, BackupStatus, WebhooksPlaceholder, ApiPlaceholder } from '@monprojetpro/module-admin'

type SystemTab = 'maintenance' | 'logs' | 'monitoring' | 'backups' | 'webhooks' | 'api'

const TABS: { id: SystemTab; label: string }[] = [
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'logs', label: "Logs d'activité" },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'backups', label: 'Backups' },
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'api', label: 'API' },
]

export default function SystemPage() {
  const [activeTab, setActiveTab] = useState<SystemTab>('maintenance')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Maintenance &amp; Système</h1>
        <p className="text-sm text-gray-400">
          Mode maintenance, supervision, logs et intégrations — s&apos;applique à toute la plateforme client (Lab + One)
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
        {activeTab === 'maintenance' && <MaintenanceMode />}
        {activeTab === 'logs' && <ActivityLogs />}
        {activeTab === 'monitoring' && <SystemHealth />}
        {activeTab === 'backups' && <BackupStatus />}
        {activeTab === 'webhooks' && <WebhooksPlaceholder />}
        {activeTab === 'api' && <ApiPlaceholder />}
      </div>
    </div>
  )
}
