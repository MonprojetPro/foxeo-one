'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@monprojetpro/ui'
import { useQuery } from '@tanstack/react-query'
import { OrpheusConfigForm } from './orpheus-config-form'
import { ElioConfigHistory } from './elio-config-history'
import { getElioConfig } from '../actions/get-elio-config'

interface ElioConfigSectionProps {
  clientId: string
  /** Slot pour le formulaire de profil de communication (injecté depuis le Hub) */
  communicationProfileSlot?: React.ReactNode
}

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

  const defaultTab = communicationProfileSlot ? 'profil' : 'configuration'

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList>
        {communicationProfileSlot && (
          <TabsTrigger value="profil">Profil de communication</TabsTrigger>
        )}
        <TabsTrigger value="configuration">Configuration Orpheus</TabsTrigger>
        <TabsTrigger value="historique" data-testid="tab-historique">
          Historique
        </TabsTrigger>
      </TabsList>

      {communicationProfileSlot && (
        <TabsContent value="profil" className="mt-4">
          {communicationProfileSlot}
        </TabsContent>
      )}

      <TabsContent value="configuration" className="mt-4">
        {isLoading ? (
          <div className="h-40 rounded-xl bg-muted animate-pulse" />
        ) : (
          <OrpheusConfigForm initialConfig={config ?? null} />
        )}
      </TabsContent>

      <TabsContent value="historique" className="mt-4">
        <ElioConfigHistory clientId={clientId} />
      </TabsContent>
    </Tabs>
  )
}
