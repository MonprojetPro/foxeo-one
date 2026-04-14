import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { DocumentViewerPageClient } from '@monprojetpro/module-documents'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Props {
  params: Promise<{ clientId: string; documentId: string }>
}

export default async function HubDocumentViewerPage({ params }: Props) {
  const { clientId, documentId } = await params

  if (!UUID_REGEX.test(clientId) || !UUID_REGEX.test(documentId)) notFound()

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Verify operator access
  const { data: operator } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!operator) notFound()

  return (
    <DocumentViewerPageClient
      documentId={documentId}
      backHref={`/modules/documents/${clientId}`}
      showVisibility
    />
  )
}
