'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, Input } from '@monprojetpro/ui'
import { cn } from '@monprojetpro/utils'
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
        /* Base — carte verre cockpit */
        'flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors',
        isSelected
          ? /* Sélectionné — accent cyan discret */
            'border border-cyan-400/25 bg-cyan-400/[0.07]'
          : /* Repos + survol */
            'border border-transparent hover:border-white/10 hover:bg-white/[0.04]'
      )}
      data-testid="conversation-item"
      aria-selected={isSelected}
    >
      <div className="relative mt-0.5 shrink-0">
        <Avatar className="h-10 w-10 border border-white/10 bg-white/[0.04]">
          <AvatarFallback className="text-sm font-medium text-gray-200 bg-transparent">
            {getInitials(conversation.clientName)}
          </AvatarFallback>
        </Avatar>
        <PresenceIndicator
          status={isOnline ? 'online' : 'offline'}
          className="absolute -bottom-0.5 -right-0.5 ring-2 ring-black/60"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={cn(
                'truncate text-sm font-medium',
                isSelected ? 'text-cyan-300' : 'text-white/90'
              )}
            >
              {conversation.clientName}
            </span>
            {conversation.dashboardType && (
              <DashboardBadge type={conversation.dashboardType} />
            )}
          </div>
          {/* Horodatage tabular */}
          <span className="shrink-0 text-[11px] tabular-nums text-gray-500">
            {formatLastMessageTime(conversation.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="truncate text-xs text-gray-500">
            {conversation.lastMessage ?? 'Aucun message'}
          </span>
          {/* Badge non-lus — accent rouge cockpit */}
          {conversation.unreadCount > 0 && (
            <span
              className="inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-red-400/20 px-1 text-[10px] font-semibold tabular-nums text-red-300 ring-1 ring-red-400/30"
              aria-label={`${conversation.unreadCount} non lus`}
            >
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </span>
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
      <div className="flex flex-col gap-1 px-2 pt-3" data-testid="chat-list-skeleton">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-3">
            {/* Avatar skeleton */}
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/5" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-28 animate-pulse rounded bg-white/5" />
              <div className="h-2.5 w-44 animate-pulse rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!conversations || conversations.length === 0) {
    return (
      /* État vide cockpit — bord pointillé centré */
      <div className="mx-2 mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center">
        <p className="text-xs text-gray-400">Aucun client trouvé.</p>
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
      {/* Barre de recherche cockpit */}
      <div className="px-3 pt-3 pb-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une conversation..."
            className="pl-8 h-8 text-xs border-white/10 bg-white/[0.03] text-gray-200 placeholder:text-gray-600 focus-visible:ring-cyan-400/30 focus-visible:border-cyan-400/25"
            aria-label="Rechercher une conversation"
          />
        </div>
      </div>

      {/* Toggle « En ligne d'abord » */}
      <div className="flex items-center justify-end px-3 py-1">
        <button
          type="button"
          onClick={() => setSortOnlineFirst((prev) => !prev)}
          className={cn(
            'rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors',
            sortOnlineFirst
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
              : 'border-white/10 text-gray-500 hover:border-white/15 hover:text-gray-300'
          )}
          data-testid="sort-online-first-toggle"
          aria-pressed={sortOnlineFirst}
        >
          En ligne d'abord
        </button>
      </div>

      {/* Liste des conversations */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {filtered.length === 0 ? (
          /* Aucun résultat de recherche */
          <p className="py-6 text-center text-xs text-gray-600">Aucun résultat</p>
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
