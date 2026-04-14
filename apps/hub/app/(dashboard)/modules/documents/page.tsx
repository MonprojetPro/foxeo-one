import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { getAllDocuments, DocumentsHubPage } from '@monprojetpro/module-documents'
import { getClients } from '@monprojetpro/modules-crm'

export default async function DocumentsHubIndex() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: operator } = user
    ? await supabase.from('operators').select('id').eq('auth_user_id', user.id).single()
    : { data: null }

  const [{ data: documents }, { data: clients }] = await Promise.all([
    getAllDocuments(),
    getClients(),
  ])

  return (
    <DocumentsHubPage
      initialDocuments={documents ?? []}
      initialClients={(clients ?? []).map((c) => ({ id: c.id, name: c.name }))}
      operatorId={(operator as { id: string } | null)?.id ?? ''}
    />
  )
}
