'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PillTabs, BlockSkeleton, type PillTab } from '@monprojetpro/ui'
import { OrpheusConfigForm } from './orpheus-config-form'
import { ElioConfigHistory } from './elio-config-history'
import { getElioConfig } from '../actions/get-elio-config'

interface ElioConfigSectionProps {
  clientId: string
  /** Slot pour le formulaire de profil de communication (injecté depuis le Hub) */
  communicationProfileSlot?: React.ReactNode
}

type TabKey = 'profil' | 'configuration' | 'historique'

/**
 * Section Configuration Élio pour la fiche client Hub (AC3 Story 8.3).
 * Combine le profil de communication, le formulaire Orpheus et l'historique.
 */
export function ElioConfigSection({ clientId, communicationProfileSlot }: ElioConfigSectionProps) {
  const { data: config, isLoading } = useQuery({
    queryKey: ['elio-config', clientId],
    queryFn: async () => {
      const result = await getElioConfig(clientId)
      if (result.error) return null
      return result.data
    },
  })

  const defaultTab: TabKey = communicationProfileSlot ? 'profil' : 'configuration'
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab)

  const tabs: PillTab<TabKey>[] = [
    ...(communicationProfileSlot ? [{ key: 'profil' as TabKey, label: 'Profil de communication' }] : []),
    { key: 'configuration', label: 'Configuration Orpheus' },
    { key: 'historique', label: 'Historique' },
  ]

  return (
    <div className="space-y-4">
      <PillTabs<TabKey>
        tabs={tabs}
        active={activeTab}
        onChange={setActiveTab}
        tone="cyan"
      />

      {activeTab === 'profil' && communicationProfileSlot && (
        <div>{communicationProfileSlot}</div>
      )}

      {activeTab === 'configuration' && (
        <div>
          {isLoading ? (
            <BlockSkeleton className="h-40" />
          ) : (
            <OrpheusConfigForm initialConfig={config ?? null} />
          )}
        </div>
      )}

      {activeTab === 'historique' && (
        <div data-testid="tab-historique">
          <ElioConfigHistory clientId={clientId} />
        </div>
      )}
    </div>
  )
}
