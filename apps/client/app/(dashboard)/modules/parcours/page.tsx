import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { ParcoursOverview } from '@monprojetpro/module-parcours'

export default async function ClientParcoursPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) notFound()

  const { data: client } = await supabase
    .from('clients')
    .select('id, first_name')
    .eq('auth_user_id', user.id)
    .single()

  if (!client) notFound()

  return (
    <div className="flex flex-col gap-6 p-6">
      <ParcoursOverview clientId={client.id} clientFirstName={client.first_name} />
    </div>
  )
}
