'use client'

import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { ChatList, ChatWindow, useConversations, markMessagesRead, type Message } from '@monprojetpro/modules-chat'
import { useQueryClient } from '@tanstack/react-query'
import { CockpitHeader, StatusPill } from '@monprojetpro/ui'

interface ChatConversationClientProps {
  clientId: string
  operatorId: string
  initialMessages: Message[]
}

export function ChatConversationClient({
  clientId,
  operatorId,
  initialMessages: _initialMessages,
}: ChatConversationClientProps) {
  const [selectedClientId, setSelectedClientId] = useState(clientId)
  const queryClient = useQueryClient()
  const { data: conversations = [] } = useConversations()

  const selectedConversation = conversations.find((c) => c.clientId === selectedClientId)

  async function handleSelectClient(newClientId: string) {
    setSelectedClientId(newClientId)
    await markMessagesRead({ clientId: newClientId })
    queryClient.invalidateQueries({ queryKey: ['conversations'] })
  }

  async function handleMarkRead(cId: string) {
    await markMessagesRead({ clientId: cId })
    queryClient.invalidateQueries({ queryKey: ['conversations'] })
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

      {/* ── Corps — sidebar + fenêtre ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar conversations */}
        <aside className="w-72 shrink-0 flex flex-col border-r border-white/10 bg-white/[0.01]">
          <div className="flex-1 overflow-hidden">
            <ChatList
              selectedClientId={selectedClientId}
              onSelectClient={handleSelectClient}
            />
          </div>
        </aside>

        {/* Fenêtre de chat */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <ChatWindow
            clientId={selectedClientId}
            operatorId={operatorId}
            currentUserType="operator"
            clientName={selectedConversation?.clientName}
            dashboardType={selectedConversation?.dashboardType}
            onMarkRead={handleMarkRead}
          />
        </main>
      </div>
    </div>
  )
}
