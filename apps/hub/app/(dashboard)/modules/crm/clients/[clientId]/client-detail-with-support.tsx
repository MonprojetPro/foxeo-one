'use client'

import { ClientDetailContent, type ExtraTab, ClientBrandingTab } from '@monprojetpro/modules-crm'
import { ClientSupportTab } from '@monprojetpro/modules-support'
import { SubmissionsList } from '@monprojetpro/module-parcours'
import { ElioConfigSection } from '@monprojetpro/module-elio'
import { LabBillingTab } from '@monprojetpro/modules-facturation'
import { ClientExportButton } from '@monprojetpro/module-admin'
import { ClientEmailTab } from '@monprojetpro/modules-email'
import { OperatorOverrideSection } from '@monprojetpro/modules-notifications'
import type { Client } from '@monprojetpro/modules-crm'
import { useMemo } from 'react'

interface ClientDetailWithSupportProps {
  client: Client
}

export function ClientDetailWithSupport({ client }: ClientDetailWithSupportProps) {
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
        content: <ElioConfigSection clientId={client.id} />,
      },
      {
        value: 'branding',
        label: 'Branding',
        content: <ClientBrandingTab clientId={client.id} clientCompanyName={client.company} />,
      },
      {
        value: 'lab-billing',
        label: 'Facturation Lab',
        content: <LabBillingTab clientId={client.id} clientName={client.name} />,
      },
      {
        value: 'administration',
        label: 'Administration',
        content: (
          <div className="space-y-6">
            <ClientExportButton clientId={client.id} />
            <OperatorOverrideSection clientId={client.id} />
          </div>
        ),
      },
    ],
    [client.id, client.company, client.name]
  )

  return <ClientDetailContent client={client} extraTabs={extraTabs} />
}
