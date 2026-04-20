'use client'

import { ClientDetailContent, type ExtraTab, ClientBrandingTab, ClientLabTabContent, ClientAdminTabContent, CommunicationProfileForm, useClientCommunicationProfile, ClientLifecycleActions } from '@monprojetpro/modules-crm'
import { ClientSupportTab } from '@monprojetpro/modules-support'
import { SubmissionsList, ParcoursHubTab } from '@monprojetpro/module-parcours'
import { ElioConfigSection } from '@monprojetpro/module-elio'
import { LabBillingTab, getClientLabStatus } from '@monprojetpro/modules-facturation'
import { ClientExportButton } from '@monprojetpro/module-admin'
import { ClientEmailTab } from '@monprojetpro/modules-email'
import { OperatorOverrideSection } from '@monprojetpro/modules-notifications'
import type { Client } from '@monprojetpro/modules-crm'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Mail, Headphones, ClipboardList, Bot, Palette, FlaskConical, Settings } from 'lucide-react'

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
        icon: Mail, color: '#60a5fa',
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
        icon: Headphones, color: '#a78bfa',
        content: <ClientSupportTab clientId={client.id} />,
      },
      {
        value: 'submissions',
        label: 'Soumissions',
        icon: ClipboardList, color: '#34d399',
        content: <SubmissionsList clientId={client.id} />,
      },
      {
        value: 'elio-config',
        label: 'Élio',
        icon: Bot, color: '#f59e0b',
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
        icon: Palette, color: '#ec4899',
        content: <ClientBrandingTab clientId={client.id} clientCompanyName={client.company} />,
      },
      {
        value: 'lab-billing',
        label: 'Lab',
        icon: FlaskConical, color: '#22d3ee',
        content: (
          <div className="space-y-6">
            <ClientLabTabContent clientId={client.id} />
            <LabBillingTab clientId={client.id} clientName={client.name} />
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Configuration Élio par étape
              </h3>
              <ParcoursHubTab clientId={client.id} />
            </div>
          </div>
        ),
      },
      {
        value: 'administration',
        label: 'Paramètres',
        icon: Settings, color: '#94a3b8',
        content: (
          <div className="space-y-6">
            <ClientAdminTabContent clientId={client.id} />
            <div className="space-y-6 p-4">
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Cycle de vie</h3>
                <div className="flex flex-wrap gap-2">
                  <ClientLifecycleActions client={client} />
                </div>
              </div>
              <OperatorOverrideSection clientId={client.id} />
            </div>
          </div>
        ),
      },
    ],
    [client.id, client.company, client.name, client.email]
  )

  return (
    <ClientDetailContent
      client={client}
      extraTabs={extraTabs}
      dashboardType={client.config?.dashboardType}
      hasActiveParcours={labActive}
    />
  )
}
