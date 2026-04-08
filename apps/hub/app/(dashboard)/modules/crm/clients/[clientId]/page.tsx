import { notFound } from 'next/navigation'
import { getClient } from '@monprojetpro/modules-crm'
import { ClientDetailWithSupport } from './client-detail-with-support'

interface ClientDetailPageProps {
  params: Promise<{
    clientId: string
  }>
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { clientId } = await params

  // Early validation — reject malformed IDs before any DB call
  if (!clientId || !UUID_REGEX.test(clientId)) {
    notFound()
  }

  // Fetch client data via Server Component (RSC pattern)
  const result = await getClient(clientId)

  // Handle errors: not found or unauthorized
  if (result.error) {
    if (result.error.code === 'NOT_FOUND' || result.error.code === 'UNAUTHORIZED') {
      notFound()
    }
    // For other errors, throw to trigger error boundary
    throw new Error(result.error.message)
  }

  if (!result.data) {
    notFound()
  }

  const client = result.data

  return <ClientDetailWithSupport client={client} />
}
