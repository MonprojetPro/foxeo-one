import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { getMeetingRequests, MeetingRequestList } from '@monprojetpro/module-visio'

export default async function HubMeetingRequestsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: requests } = await getMeetingRequests({})

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Demandes de visio</h1>
      </div>
      <MeetingRequestList requests={requests ?? []} />
    </div>
  )
}
