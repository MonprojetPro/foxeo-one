'use client'

import { useRouter } from 'next/navigation'
import { ChatList, useConversations, type Conversation } from '@monprojetpro/modules-chat'

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
    <div className="flex h-full overflow-hidden">
      {/* ── Sidebar conversations ── */}
      <aside className="w-72 shrink-0 border-r flex flex-col bg-muted/5">
        <div className="border-b px-4 py-3 shrink-0">
          <h1 className="text-sm font-semibold">Messages</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {conversations.length} conversation{conversations.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex-1 overflow-hidden">
          <ChatList onSelectClient={handleSelectClient} />
        </div>
      </aside>

      {/* ── Zone principale — état vide ── */}
      <main className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="text-5xl opacity-20">💬</div>
          <p className="text-sm font-medium">Sélectionnez une conversation</p>
          <p className="text-xs opacity-60">Choisissez un client dans la liste pour démarrer</p>
        </div>
      </main>
    </div>
  )
}
