import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { MeetingLobby } from '@monprojetpro/module-visio'

interface ClientLobbyPageProps {
  params: Promise<{ meetingId: string }>
}

export default async function ClientLobbyPage({ params }: ClientLobbyPageProps) {
  const { meetingId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Validate meeting exists and client has access (RLS enforces this)
  const { data: meeting } = await supabase
    .from('meetings')
    .select('id')
    .eq('id', meetingId)
    .single()

  if (!meeting) notFound()

  return (
    <div className="flex flex-col gap-6 p-6">
      <MeetingLobby meetingId={meetingId} userType="client" />
    </div>
  )
}
