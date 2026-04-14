import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { MeetingRoom } from '@monprojetpro/module-visio'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Props {
  params: Promise<{ meetingId: string }>
}

export default async function HubMeetingRoomPage({ params }: Props) {
  const { meetingId } = await params

  if (!UUID_REGEX.test(meetingId)) notFound()

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <a href="/modules/visio" className="text-sm text-muted-foreground hover:text-foreground">
          ← Retour aux meetings
        </a>
      </div>
      <MeetingRoom meetingId={meetingId} />
    </div>
  )
}
