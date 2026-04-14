'use client'

import { ChatWindow, type Message } from '@monprojetpro/modules-chat'

interface ChatClientPageClientProps {
  clientId: string
  operatorId: string
  initialMessages: Message[]
}

export function ChatClientPageClient({
  clientId,
  operatorId,
  initialMessages: _initialMessages,
}: ChatClientPageClientProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <h1 className="text-lg font-semibold">Messages</h1>
        <p className="text-sm text-muted-foreground">Conversation avec votre accompagnateur</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatWindow
          clientId={clientId}
          operatorId={operatorId}
          currentUserType="client"
        />
      </div>
    </div>
  )
}
