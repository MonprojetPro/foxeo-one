import { getClients } from '@monprojetpro/modules-crm'
import { CRMPageClient } from './crm-page-client'

export default async function CRMPage() {
  const { data: clients } = await getClients()

  return <CRMPageClient initialClients={clients ?? []} />
}
