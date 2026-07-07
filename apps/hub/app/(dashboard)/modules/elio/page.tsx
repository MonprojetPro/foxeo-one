import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { ElioChat } from '@monprojetpro/module-elio'

// Boucle agent Élio Hub : jusqu'à 8 tours d'outils (~55 s de budget interne).
// Les Server Actions invoquées depuis cette page héritent de ce maxDuration.
export const maxDuration = 60

export default async function ElioHubPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ?conversation= : ouvrir directement une conversation (liens du widget sidebar)
  const { conversation } = await searchParams

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <ElioChat
        dashboardType="hub"
        userId={user?.id ?? ''}
        initialConversationId={conversation}
      />
    </div>
  )
}
