'use client'

import { Badge } from '@monprojetpro/ui'
import { cn } from '@monprojetpro/utils'
import { useConversations } from '../hooks/use-conversations'

interface UnreadBadgeProps {
  className?: string
}

export function UnreadBadge({ className }: UnreadBadgeProps) {
  const { data: conversations } = useConversations()

  const totalUnread = conversations?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0

  if (totalUnread === 0) return null

  return (
    <Badge
      variant="destructive"
      className={cn('h-5 min-w-5 px-1 text-xs', className)}
      aria-label={`${totalUnread} messages non lus`}
      data-testid="unread-badge"
    >
      {totalUnread > 99 ? '99+' : totalUnread}
    </Badge>
  )
}
