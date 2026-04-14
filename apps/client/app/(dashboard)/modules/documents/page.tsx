import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { getDocuments, DocumentsPageClient } from '@monprojetpro/module-documents'

export default async function ClientDocumentsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Get client record
  const { data: client } = await supabase
    .from('clients')
    .select('id, operator_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!client) notFound()

  // Load documents
  const { data: documents } = await getDocuments({ clientId: client.id })

  return (
    <DocumentsPageClient
      clientId={client.id}
      operatorId={client.operator_id}
      uploadedBy="client"
      initialDocuments={documents ?? []}
      showVisibility={false}
      viewerBaseHref="/modules/documents"
      isOperator={false}
    />
  )
}
