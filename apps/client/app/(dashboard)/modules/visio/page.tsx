import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { getMeetings, MeetingList } from '@monprojetpro/module-visio'

export default async function ClientVisioPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!client) notFound()

  const { data: meetings } = await getMeetings({ clientId: client.id })

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mes Meetings</h1>
      </div>
      <MeetingList meetings={meetings ?? []} basePath="/modules/visio" />
    </div>
  )
}
