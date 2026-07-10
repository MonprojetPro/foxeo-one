'use client'

import { cn } from '@monprojetpro/utils'
import { useConversations } from '../hooks/use-conversations'

interface UnreadBadgeProps {
  className?: string
}

/**
 * Badge de compteur de messages non lus — style cockpit (rouge discret, ring).
 * Utilisé dans la sidebar du Hub pour le module Chat.
 */
export function UnreadBadge({ className }: UnreadBadgeProps) {
  const { data: conversations } = useConversations()

  const totalUnread = conversations?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0

  if (totalUnread === 0) return null

  return (
    <span
      className={cn(
        /* Pastille cockpit — accent rouge discret, police tabular */
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full',
        'bg-red-400/20 px-1 text-[0.7rem] font-semibold tabular-nums text-red-300 ring-1 ring-red-400/30',
        className
      )}
      aria-label={`${totalUnread} messages non lus`}
      data-testid="unread-badge"
    >
      {totalUnread > 99 ? '99+' : totalUnread}
    </span>
  )
}
