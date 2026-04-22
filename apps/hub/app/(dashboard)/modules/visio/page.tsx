import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { getMeetings } from '@monprojetpro/module-visio'
import { HubVisioClient } from './hub-visio-client'

export default async function HubVisioPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: meetings } = await getMeetings({})

  return (
    <div className="flex flex-col gap-6 p-6">
      <HubVisioClient meetings={meetings ?? []} operatorId={user.id} />
    </div>
  )
}
