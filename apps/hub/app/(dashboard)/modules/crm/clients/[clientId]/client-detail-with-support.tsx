'use client'

import { ClientDetailContent, type ExtraTab, ClientBrandingTab } from '@foxeo/modules/crm'
import { ClientSupportTab } from '@foxeo/modules-support'
import { SubmissionsList } from '@foxeo/module-parcours'
import { ElioConfigSection } from '@foxeo/modules/elio'
import { LabBillingTab } from '@foxeo/modules/facturation'
import type { Client } from '@foxeo/modules/crm'
import { useMemo } from 'react'

interface ClientDetailWithSupportProps {
  client: Client
}

export function ClientDetailWithSupport({ client }: ClientDetailWithSupportProps) {
  const extraTabs: ExtraTab[] = useMemo(
    () => [
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
    ],
    [client.id, client.company, client.name]
  )

  return <ClientDetailContent client={client} extraTabs={extraTabs} />
}
