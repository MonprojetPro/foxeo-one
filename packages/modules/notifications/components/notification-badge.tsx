'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@monprojetpro/ui'
import { useUnreadCount } from '../hooks/use-unread-count'
import { useNotificationsRealtime } from '../hooks/use-notifications-realtime'
import { NotificationCenter } from './notification-center'

interface NotificationBadgeProps {
  recipientId: string
}

export function NotificationBadge({ recipientId }: NotificationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { data: count = 0 } = useUnreadCount(recipientId)

  useNotificationsRealtime(recipientId)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${count > 0 ? ` (${count} non lues)` : ''}`}
        data-testid="notification-badge-button"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white"
            data-testid="notification-badge-count"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Button>

      {isOpen && (
        <NotificationCenter
          recipientId={recipientId}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

NotificationBadge.displayName = 'NotificationBadge'
