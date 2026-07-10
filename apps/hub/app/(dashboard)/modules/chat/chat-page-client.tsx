'use client'

import { useRouter } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { ChatList, useConversations, type Conversation } from '@monprojetpro/modules-chat'
import { CockpitHeader, StatusPill } from '@monprojetpro/ui'

interface ChatPageClientProps {
  initialConversations: Conversation[]
}

export function ChatPageClient({ initialConversations: _initial }: ChatPageClientProps) {
  const router = useRouter()
  const { data: conversations = [] } = useConversations()

  function handleSelectClient(clientId: string) {
    router.push(`/modules/chat/${clientId}`)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── En-tête cockpit ── */}
      <div className="shrink-0 px-4 pt-4 pb-3">
        <CockpitHeader
          icon={MessageSquare}
          title="Messages"
          subtitle={`${conversations.length} conversation${conversations.length > 1 ? 's' : ''}`}
          tone="cyan"
          status={<StatusPill state="live" label="Realtime actif" />}
        />
      </div>

      {/* ── Corps — sidebar + zone vide ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar conversations */}
        <aside className="w-72 shrink-0 flex flex-col border-r border-white/10 bg-white/[0.01]">
          <div className="flex-1 overflow-hidden">
            <ChatList onSelectClient={handleSelectClient} />
          </div>
        </aside>

        {/* Zone principale — état vide (aucune conversation sélectionnée) */}
        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-10 py-14">
            {/* Pastille d'icône cockpit */}
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300 shadow-[0_0_24px_-8px_theme(colors.cyan.400/10)]">
              <MessageSquare className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-white/80">Sélectionnez une conversation</p>
            <p className="text-xs text-gray-500">Choisissez un client dans la liste pour démarrer</p>
          </div>
        </main>
      </div>
    </div>
  )
}
