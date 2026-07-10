import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { getMeetingRecordings } from '@monprojetpro/module-visio'
import { RecordingListPage } from '@monprojetpro/module-visio'
import { FileVideo } from 'lucide-react'
import { CockpitHeader } from '@monprojetpro/ui'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Props {
  params: Promise<{ meetingId: string }>
}

export default async function HubRecordingsPage({ params }: Props) {
  const { meetingId } = await params

  if (!UUID_REGEX.test(meetingId)) notFound()

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: recordings } = await getMeetingRecordings({ meetingId })

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Fil d'Ariane */}
      <a href={`/modules/visio/${meetingId}`} className="w-fit text-sm text-gray-400 transition-colors hover:text-gray-200">
        ← Retour au meeting
      </a>

      {/* ── En-tête cockpit ── */}
      <CockpitHeader
        icon={FileVideo}
        title="Enregistrements"
        subtitle="Replay et ressources de la session"
        tone="cyan"
      />

      {/* Composant de liste fourni par le module visio — non modifié */}
      <RecordingListPage recordings={recordings ?? []} />
    </div>
  )
}
