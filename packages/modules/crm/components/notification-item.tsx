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
    /* Notification cockpit — lue = atténuée, non lue = bordure cyan */
    <div
      className={`rounded-xl border p-3 space-y-2 transition-colors ${
        !isUnread
          ? 'border-white/5 bg-white/[0.01] opacity-60'
          : 'border-cyan-400/20 bg-white/[0.02] hover:bg-white/[0.04]'
      }`}
      data-testid={`notification-item-${notification.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {/* Point cyan pour les notifications non lues */}
            {isUnread && (
              <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0" />
            )}
            <p className="text-sm font-medium text-white">{notification.title}</p>
          </div>
          {notification.body && (
            <p className="text-xs text-gray-400">
              {notification.body}
            </p>
          )}
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap">
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
