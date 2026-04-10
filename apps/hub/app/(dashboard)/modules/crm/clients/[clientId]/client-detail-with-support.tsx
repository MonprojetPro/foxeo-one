'use client'

import { ClientDetailContent, type ExtraTab, ClientBrandingTab, CommunicationProfileForm, useClientCommunicationProfile, ClientLifecycleActions } from '@monprojetpro/modules-crm'
import { ClientSupportTab } from '@monprojetpro/modules-support'
import { SubmissionsList } from '@monprojetpro/module-parcours'
import { ElioConfigSection } from '@monprojetpro/module-elio'
import { LabBillingTab, getClientLabStatus } from '@monprojetpro/modules-facturation'
import { ClientExportButton } from '@monprojetpro/module-admin'
import { ClientEmailTab } from '@monprojetpro/modules-email'
import { OperatorOverrideSection } from '@monprojetpro/modules-notifications'
import type { Client } from '@monprojetpro/modules-crm'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

interface ClientDetailWithSupportProps {
  client: Client
}

function CommunicationProfileTabContent({ clientId }: { clientId: string }) {
  const { data: profile, isLoading } = useClientCommunicationProfile(clientId)

  if (isLoading) {
    return <div className="h-40 rounded-xl bg-muted animate-pulse" />
  }

  return <CommunicationProfileForm clientId={clientId} initialProfile={profile} />
}

export function ClientDetailWithSupport({ client }: ClientDetailWithSupportProps) {
  const { data: labStatus } = useQuery({
    queryKey: ['billing', 'lab-status', client.id],
    queryFn: async () => {
      const result = await getClientLabStatus(client.id)
      if (result.error) return null
      return result.data
    },
    staleTime: 5 * 60 * 1_000,
  })

  const labActive = labStatus?.dashboardActivated ?? false

  const extraTabs: ExtraTab[] = useMemo(
    () => [
      {
        value: 'emails',
        label: 'Emails',
        content: (
          <ClientEmailTab
            clientId={client.id}
            clientEmail={client.email}
            returnTo={`/modules/crm/clients/${client.id}`}
          />
        ),
      },
      {
        value: 'support',
        label: 'Support',
        content: <ClientSupportTab clientId={client.id} />,
      },
      {
        value: 'submissions',
        label: 'Soumissions',
        content: <SubmissionsList clientId={client.id} />,
      },
      {
        value: 'elio-config',
        label: 'Configuration Élio',
        content: (
          <ElioConfigSection
            clientId={client.id}
            communicationProfileSlot={
              <CommunicationProfileTabContent clientId={client.id} />
            }
          />
        ),
      },
      {
        value: 'branding',
        label: 'Branding',
        content: <ClientBrandingTab clientId={client.id} clientCompanyName={client.company} />,
      },
      {
        value: 'lab-billing',
        label: 'Lab',
        content: <LabBillingTab clientId={client.id} clientName={client.name} />,
      },
      {
        value: 'administration',
        label: 'Administration',
        content: (
          <div className="space-y-6 p-4">
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Cycle de vie</h3>
              <div className="flex flex-wrap gap-2">
                <ClientLifecycleActions client={client} />
              </div>
            </div>
            <ClientExportButton clientId={client.id} />
            <OperatorOverrideSection clientId={client.id} />
          </div>
        ),
      },
    ],
    [client.id, client.company, client.name, client.email]
  )

  return <ClientDetailContent client={client} extraTabs={extraTabs} labActive={labActive} />
}
