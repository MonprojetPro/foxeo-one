'use client'

import { useState } from 'react'
import { Wrench, ScrollText, Activity, HardDrive, Webhook, KeyRound } from 'lucide-react'
import { ActivityLogs, MaintenanceMode, SystemHealth, BackupStatus, WebhooksPlaceholder, ApiPlaceholder } from '@monprojetpro/module-admin'
import { CockpitHeader, PillTabs } from '@monprojetpro/ui'

type SystemTab = 'maintenance' | 'logs' | 'monitoring' | 'backups' | 'webhooks' | 'api'

export default function SystemPage() {
  const [activeTab, setActiveTab] = useState<SystemTab>('maintenance')

  return (
    <div className="space-y-6 p-6 md:p-8">
      {/* En-tête cockpit */}
      <CockpitHeader
        icon={Wrench}
        title="Maintenance & Système"
        subtitle="Mode maintenance, supervision, logs et intégrations — s'applique à toute la plateforme client (Lab + One)"
        tone="cyan"
      />

      {/* Navigation à pills */}
      <PillTabs
        tabs={[
          { key: 'maintenance', label: 'Maintenance', icon: Wrench },
          { key: 'logs', label: "Logs d'activité", icon: ScrollText },
          { key: 'monitoring', label: 'Monitoring', icon: Activity },
          { key: 'backups', label: 'Backups', icon: HardDrive },
          { key: 'webhooks', label: 'Webhooks', icon: Webhook },
          { key: 'api', label: 'API', icon: KeyRound },
        ]}
        active={activeTab}
        onChange={(key) => setActiveTab(key as SystemTab)}
        tone="cyan"
      />

      {/* Contenu de l'onglet actif */}
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
