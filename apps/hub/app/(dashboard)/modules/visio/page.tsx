import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { getMeetings, MeetingList } from '@monprojetpro/module-visio'

export default async function HubVisioPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: meetings } = await getMeetings({})

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Meetings — Vue globale</h1>
      </div>
      <MeetingList meetings={meetings ?? []} basePath="/modules/visio" />
    </div>
  )
}
