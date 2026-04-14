'use client'

import { Button } from '@monprojetpro/ui'
import { useMarkNotificationRead } from '../hooks/use-notifications'
import type { Notification } from '../types/crm.types'

interface NotificationItemProps {
  notification: Notification
  onViewLink?: (link: string) => void
}

const formatRelativeDate = (isoDate: string): string => {
  const now = new Date()
  const date = new Date(isoDate)
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) return `Il y a ${diffDays} jours`
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function NotificationItem({
  notification,
  onViewLink,
}: NotificationItemProps) {
  const markRead = useMarkNotificationRead()

  const isUnread = !notification.readAt

  const handleMarkRead = () => {
    markRead.mutate(notification.id)
  }

  const handleViewLink = () => {
    if (notification.link) {
      onViewLink?.(notification.link)
      if (isUnread) {
        markRead.mutate(notification.id)
      }
    }
  }

  return (
    <div
      className={`rounded-lg border p-3 space-y-2 ${
        !isUnread ? 'opacity-60' : 'border-primary/30'
      }`}
      data-testid={`notification-item-${notification.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isUnread && (
              <span className="h-2 w-2 rounded-full bg-primary" />
            )}
            <p className="text-sm font-medium">{notification.title}</p>
          </div>
          {notification.body && (
            <p className="text-xs text-muted-foreground">
              {notification.body}
            </p>
          )}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatRelativeDate(notification.createdAt)}
        </span>
      </div>

      <div className="flex gap-2">
        {notification.link && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewLink}
            data-testid="notification-view-link"
          >
            Voir le détail
          </Button>
        )}
        {isUnread && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkRead}
            disabled={markRead.isPending}
            data-testid="notification-mark-read"
          >
            Ignorer
          </Button>
        )}
      </div>
    </div>
  )
}

NotificationItem.displayName = 'NotificationItem'
