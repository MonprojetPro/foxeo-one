import { Sparkles } from 'lucide-react'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { ElioChat } from '@monprojetpro/module-elio'
import { CockpitHeader } from '@monprojetpro/ui'

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
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-6 p-6 md:p-8">
      {/* Bannière cockpit — cohérence avec les autres pages du Hub */}
      <CockpitHeader
        icon={Sparkles}
        title="Élio Hub — Ton assistant"
        subtitle="Ton bras droit IA : pilote le Hub, demande un avis, rédige, ajuste ses directives."
        tone="cyan"
      />
      {/* Chat dans une carte verre arrondie (header interne masqué → pas de double titre) */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.01]">
        <ElioChat
          dashboardType="hub"
          userId={user?.id ?? ''}
          initialConversationId={conversation}
          hideHeader
        />
      </div>
    </div>
  )
}
