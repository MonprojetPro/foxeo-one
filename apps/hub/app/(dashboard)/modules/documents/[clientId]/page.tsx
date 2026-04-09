import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { getDocuments, DocumentsPageClient } from '@monprojetpro/module-documents'
import { SyncToZipButton } from '@monprojetpro/module-documents'
import { ArrowLeft } from 'lucide-react'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Props {
  params: Promise<{ clientId: string }>
}

export default async function ClientDocumentsPage({ params }: Props) {
  const { clientId } = await params

  // Validate clientId is a valid UUID
  if (!UUID_REGEX.test(clientId)) notFound()

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

  const op = operator as { id: string }

  // Verify client belongs to this operator
  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', clientId)
    .eq('operator_id', op.id)
    .single()

  if (!client) notFound()

  const cl = client as { id: string; name: string }

  // Load documents
  const { data: documents } = await getDocuments({ clientId })

  const sharedDocumentCount = (documents ?? []).filter((d) => d.visibility === 'shared').length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-4 pt-4">
        <Link
          href={`/modules/crm/clients/${clientId}?tab=documents`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {cl.name}
        </Link>
        <SyncToZipButton clientId={clientId} documentCount={sharedDocumentCount} />
      </div>
      <DocumentsPageClient
        clientId={clientId}
        operatorId={op.id}
        uploadedBy="operator"
        initialDocuments={documents ?? []}
        showVisibility
        showBatchActions
        viewerBaseHref={`/modules/documents/${clientId}`}
        isOperator={true}
        clientName={cl.name}
      />
    </div>
  )
}
