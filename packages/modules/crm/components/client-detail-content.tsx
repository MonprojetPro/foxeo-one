'use client'

import { useState } from 'react'
import { ClientHeader } from './client-header'
import { ClientTabs } from './client-tabs'
import { EditClientDialog } from './edit-client-dialog'
import { ArchivedBanner } from './archived-banner'
import { useClient } from '../hooks/use-client'
import type { Client } from '../types/crm.types'
import type { ExtraTab } from './client-tabs'

interface ClientDetailContentProps {
  client: Client
  extraTabs?: ExtraTab[]
  dashboardType?: string
  hasActiveParcours?: boolean
  /** Actions header injectées par le Hub (ex. « Se connecter comme »). */
  headerActionsSlot?: React.ReactNode
}

export function ClientDetailContent({ client: initialClient, extraTabs, dashboardType, hasActiveParcours, headerActionsSlot }: ClientDetailContentProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Use TanStack Query with initialData from Server Component
  // After edit mutation invalidates ['client', id], header auto-refreshes
  const { data: client } = useClient(initialClient.id, {
    initialData: initialClient,
  })

  const displayClient = client ?? initialClient
  const isArchived = displayClient.status === 'archived'

  return (
    <>
      <div className="container mx-auto py-6 space-y-6">
        {isArchived && (
          <ArchivedBanner
            clientId={displayClient.id}
            archivedAt={displayClient.archivedAt}
          />
        )}
        <ClientHeader
          client={displayClient}
          onEdit={isArchived ? undefined : () => setIsEditDialogOpen(true)}
          dashboardType={dashboardType}
          hasActiveParcours={hasActiveParcours}
          headerActionsSlot={headerActionsSlot}
        />
        <ClientTabs
          client={displayClient}
          extraTabs={extraTabs}
        />
      </div>

      {/* Controlled Edit Dialog (no trigger, opened programmatically) */}
      {!isArchived && (
        <EditClientDialog
          client={displayClient}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
    </>
  )
}
