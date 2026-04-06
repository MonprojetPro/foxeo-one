'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, Badge, Skeleton, Input } from '@foxeo/ui'
import { cn } from '@foxeo/utils'
import { Search } from 'lucide-react'
import { useConversations } from '../hooks/use-conversations'
import { useOnlineUsers } from '../hooks/use-online-users'
import { PresenceIndicator } from './presence-indicator'
import type { Conversation } from '../types/chat.types'

interface ChatListProps {
  selectedClientId?: string
  onSelectClient: (clientId: string) => void
}

function formatLastMessageTime(isoDate: string | null): string {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) {
    return date.toLocaleDateString('fr-FR', { weekday: 'short' })
  }
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function DashboardBadge({ type }: { type: 'lab' | 'one' }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        type === 'lab'
          ? 'bg-violet-500/20 text-violet-400'
          : 'bg-emerald-500/20 text-emerald-400'
      )}
    >
      {type === 'lab' ? 'Lab' : 'One'}
    </span>
  )
}

function ConversationItem({
  conversation,
  isSelected,
  isOnline,
  onClick,
}: {
  conversation: Conversation
  isSelected: boolean
  isOnline: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors',
        isSelected
          ? 'bg-primary/10 border border-primary/20'
          : 'hover:bg-muted/40 border border-transparent'
      )}
      data-testid="conversation-item"
      aria-selected={isSelected}
    >
      <div className="relative mt-0.5 shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="text-sm font-medium">
            {getInitials(conversation.clientName)}
          </AvatarFallback>
        </Avatar>
        <PresenceIndicator
          status={isOnline ? 'online' : 'offline'}
          className="absolute -bottom-0.5 -right-0.5 ring-2 ring-background"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn('truncate text-sm font-medium', isSelected && 'text-primary')}>
              {conversation.clientName}
            </span>
            {conversation.dashboardType && (
              <DashboardBadge type={conversation.dashboardType} />
            )}
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatLastMessageTime(conversation.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="truncate text-xs text-muted-foreground">
            {conversation.lastMessage ?? 'Aucun message'}
          </span>
          {conversation.unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="h-4 min-w-4 shrink-0 px-1 text-[10px] rounded-full"
              aria-label={`${conversation.unreadCount} non lus`}
            >
              {conversation.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  )
}

export function ChatList({ selectedClientId, onSelectClient }: ChatListProps) {
  const { data: conversations, isPending } = useConversations()
  const onlineUsers = useOnlineUsers()
  const [sortOnlineFirst, setSortOnlineFirst] = useState(false)
  const [search, setSearch] = useState('')

  if (isPending) {
    return (
      <div className="flex flex-col gap-1 p-2" data-testid="chat-list-skeleton">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground text-sm p-4 text-center">
        Aucun client trouvé.
      </div>
    )
  }

  const onlineSet = new Set(onlineUsers)

  let filtered = search.trim()
    ? conversations.filter((c) =>
        c.clientName.toLowerCase().includes(search.toLowerCase()) ||
        c.clientEmail.toLowerCase().includes(search.toLowerCase())
      )
    : conversations

  if (sortOnlineFirst) {
    filtered = [...filtered].sort((a, b) => {
      const aOnline = onlineSet.has(a.clientId) ? 1 : 0
      const bOnline = onlineSet.has(b.clientId) ? 1 : 0
      return bOnline - aOnline
    })
  }

  return (
    <div className="flex flex-col h-full" data-testid="chat-list">
      {/* Search */}
      <div className="px-3 pt-2 pb-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une conversation..."
            className="pl-8 h-8 text-xs"
            aria-label="Rechercher une conversation"
          />
        </div>
      </div>

      {/* Sort toggle */}
      <div className="flex items-center justify-end px-3 py-1">
        <button
          type="button"
          onClick={() => setSortOnlineFirst((prev) => !prev)}
          className={cn(
            'text-[11px] px-2 py-0.5 rounded transition-colors',
            sortOnlineFirst
              ? 'bg-green-500/15 text-green-500 font-medium'
              : 'text-muted-foreground hover:text-foreground'
          )}
          data-testid="sort-online-first-toggle"
          aria-pressed={sortOnlineFirst}
        >
          En ligne d'abord
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Aucun résultat</p>
        ) : (
          filtered.map((conversation) => (
            <ConversationItem
              key={conversation.clientId}
              conversation={conversation}
              isSelected={selectedClientId === conversation.clientId}
              isOnline={onlineSet.has(conversation.clientId)}
              onClick={() => onSelectClient(conversation.clientId)}
            />
          ))
        )}
      </div>
    </div>
  )
}
