'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { resolveAccountantNotification } from '../actions/resolve-accountant-notification'
import { showSuccess, showError } from '@monprojetpro/ui'
import { Bell, CheckCircle, Settings } from 'lucide-react'
import { AccountantConfigPanel } from './accountant-config-panel'
import { getAccountantNotifications, type AccountantNotificationRow } from '../actions/resolve-accountant-notification'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AccountantNotification = AccountantNotificationRow

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<AccountantNotification['type'], string> = {
  missing_receipt: 'Justificatif manquant',
  info_request: "Demande d'info",
  other: 'Message comptable',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Notification Item ─────────────────────────────────────────────────────────

function NotificationItem({
  notification,
  onResolved,
}: {
  notification: AccountantNotification
  onResolved: (id: string) => void
}) {
  const [isResolving, startResolve] = useTransition()

  function handleResolve() {
    startResolve(async () => {
      const result = await resolveAccountantNotification(notification.id)
      if (result.error) {
        showError(result.error.message)
        return
      }
      showSuccess('Notification résolue')
      onResolved(notification.id)
    })
  }

  return (
    <div
      className="rounded-md border border-border p-4 flex flex-col gap-2"
      data-testid="notification-item"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          {notification.status === 'unread' && (
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{notification.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {TYPE_LABELS[notification.type]}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(notification.created_at)}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleResolve}
          disabled={isResolving}
          className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-green-500 transition-colors disabled:opacity-50"
          data-testid="resolve-btn"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          {isResolving ? 'Résolution…' : 'Résolu'}
        </button>
      </div>

      {notification.body && (
        <p className="text-xs text-muted-foreground line-clamp-2">{notification.body}</p>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AccountantNotifications() {
  const queryClient = useQueryClient()
  const [showConfig, setShowConfig] = useState(false)

  const { data: notifications = [], isPending } = useQuery<AccountantNotification[]>({
    queryKey: ['accountant-notifications'],
    queryFn: async () => {
      const result = await getAccountantNotifications()
      if (result.error) throw new Error(result.error.message)
      return result.data ?? []
    },
    staleTime: 2 * 60 * 1_000,
  })

  const activeNotifications = notifications.filter((n) => n.status !== 'resolved')
  const unreadCount = activeNotifications.filter((n) => n.status === 'unread').length

  function handleResolved(id: string) {
    queryClient.setQueryData<AccountantNotification[]>(
      ['accountant-notifications'],
      (prev) => (prev ?? []).map((n) => (n.id === id ? { ...n, status: 'resolved' } : n))
    )
  }

  return (
    <div className="flex flex-col gap-3" data-testid="accountant-notifications">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Notifications comptable</span>
          {unreadCount > 0 && (
            <span
              className="flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-primary text-primary-foreground text-xs font-medium"
              data-testid="unread-badge"
            >
              {unreadCount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowConfig((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-testid="configure-btn"
        >
          <Settings className="h-3.5 w-3.5" />
          Configurer
        </button>
      </div>

      {/* Config panel */}
      {showConfig && (
        <AccountantConfigPanel onClose={() => setShowConfig(false)} />
      )}

      {/* Content */}
      {isPending ? (
        <div className="flex flex-col gap-2 animate-pulse" data-testid="notifications-skeleton">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-md border border-border p-4 h-16 bg-muted/30" />
          ))}
        </div>
      ) : activeNotifications.length === 0 ? (
        <div
          className="rounded-md border border-border p-6 flex flex-col items-center gap-2 text-center"
          data-testid="empty-state"
        >
          <CheckCircle className="h-8 w-8 text-green-500/50" />
          <p className="text-sm text-muted-foreground">
            Aucune demande en attente de votre comptable ✓
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {activeNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onResolved={handleResolved}
            />
          ))}
        </div>
      )}
    </div>
  )
}
