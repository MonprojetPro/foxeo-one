'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@monprojetpro/ui'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ClientInfoTab } from './client-info-tab'
import { ClientTimeline } from './client-timeline'
import { ClientDocumentsTab } from './client-documents-tab'
import { ClientExchangesTab } from './client-exchanges-tab'
import { ModuleToggleList } from './module-toggle-list'
import { ElioDocForm } from './elio-doc-form'
import type { ModuleManifest } from '@monprojetpro/types'

export interface ExtraTab {
  value: string
  label: string
  content: React.ReactNode
}

interface ClientTabsProps {
  clientId: string
  onEdit?: () => void
  extraTabs?: ExtraTab[]
  activeModules?: string[]
  allModules?: ModuleManifest[]
}

export function ClientTabs({ clientId, onEdit, extraTabs = [], activeModules = [], allModules = [] }: ClientTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeTab = searchParams.get('tab') || 'informations'

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="informations">Informations</TabsTrigger>
        <TabsTrigger value="historique">Historique</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
        <TabsTrigger value="echanges">Échanges</TabsTrigger>
        <TabsTrigger value="modules">One</TabsTrigger>
        {extraTabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="informations">
        <ClientInfoTab clientId={clientId} onEdit={onEdit} />
      </TabsContent>

      <TabsContent value="historique">
        <ClientTimeline clientId={clientId} />
      </TabsContent>

      <TabsContent value="documents">
        <ClientDocumentsTab clientId={clientId} />
      </TabsContent>

      <TabsContent value="echanges">
        <ClientExchangesTab clientId={clientId} />
      </TabsContent>

      <TabsContent value="modules">
        <div className="space-y-8">
          <section>
            <h3 className="text-lg font-semibold mb-4">Modules actifs</h3>
            <ModuleToggleList
              clientId={clientId}
              activeModules={activeModules}
              allModules={allModules}
            />
          </section>
          <section>
            <h3 className="text-lg font-semibold mb-4">Documentation Élio</h3>
            <ElioDocForm clientId={clientId} activeModules={activeModules} />
          </section>
        </div>
      </TabsContent>

      {extraTabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
