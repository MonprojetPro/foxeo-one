'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@monprojetpro/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNotifications } from '../hooks/use-notifications'
import { markAllAsRead } from '../actions/mark-all-as-read'
import { deleteAllNotifications } from '../actions/delete-all-notifications'
import { NotificationItem } from './notification-item'

interface NotificationCenterProps {
  recipientId: string
  onClose: () => void
}

export function NotificationCenter({ recipientId, onClose }: NotificationCenterProps) {
  const ref = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const { data: notifications = [], isPending } = useNotifications(recipientId)

  const markAllMutation = useMutation({
    mutationFn: () => markAllAsRead(recipientId),
    onSuccess: (response) => {
      if (!response.error) {
        queryClient.invalidateQueries({ queryKey: ['notifications', recipientId] })
        queryClient.invalidateQueries({
          queryKey: ['notifications', recipientId, 'unread-count'],
        })
      }
    },
  })

  const deleteAllMutation = useMutation({
    mutationFn: () => deleteAllNotifications(recipientId),
    onSuccess: (response) => {
      if (!response.error) {
        queryClient.invalidateQueries({ queryKey: ['notifications', recipientId] })
        queryClient.invalidateQueries({
          queryKey: ['notifications', recipientId, 'unread-count'],
        })
      }
    },
  })

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const hasUnread = notifications.some((n) => !n.readAt)

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border bg-card shadow-lg z-50"
      data-testid="notification-center"
    >
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="text-sm font-semibold">Notifications</h3>
        <div className="flex items-center gap-1">
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              data-testid="mark-all-read-button"
            >
              Tout marquer lu
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteAllMutation.mutate()}
              disabled={deleteAllMutation.isPending}
              className="text-muted-foreground hover:text-destructive"
              data-testid="delete-all-button"
            >
              Vider
            </Button>
          )}
        </div>
      </div>

      <div className="divide-y">
        {isPending && (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-3 w-3/4 rounded bg-muted" />
                <div className="h-2 w-1/2 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {!isPending && notifications.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Aucune notification
          </div>
        )}

        {!isPending &&
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              recipientId={recipientId}
              onClose={onClose}
            />
          ))}
      </div>
    </div>
  )
}

NotificationCenter.displayName = 'NotificationCenter'
