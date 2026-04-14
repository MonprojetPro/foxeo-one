'use client'

import { useState } from 'react'
import { ChatList, ChatWindow, useConversations, markMessagesRead, type Message } from '@monprojetpro/modules-chat'
import { useQueryClient } from '@tanstack/react-query'

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
          <ChatList
            selectedClientId={selectedClientId}
            onSelectClient={handleSelectClient}
          />
        </div>
      </aside>

      {/* ── Fenêtre chat ── */}
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
  )
}
