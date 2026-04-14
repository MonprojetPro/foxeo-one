import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { getMeetingRecordings } from '@monprojetpro/module-visio'
import { RecordingListPage } from '@monprojetpro/module-visio'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Props {
  params: Promise<{ meetingId: string }>
}

export default async function ClientRecordingsPage({ params }: Props) {
  const { meetingId } = await params

  if (!UUID_REGEX.test(meetingId)) notFound()

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: recordings } = await getMeetingRecordings({ meetingId })

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <a href={`/modules/visio/${meetingId}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Retour au meeting
        </a>
      </div>
      <h1 className="text-xl font-semibold">Enregistrements</h1>
      <RecordingListPage recordings={recordings ?? []} />
    </div>
  )
}
