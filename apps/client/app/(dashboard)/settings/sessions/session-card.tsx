'use client'

import type { SessionInfo } from '@monprojetpro/utils'
import { formatRelativeDate } from '@monprojetpro/utils'

interface SessionCardProps {
  session: SessionInfo
  onRevoke: (sessionId: string) => void
  isPending: boolean
}

function DeviceIcon({ deviceType }: { deviceType: SessionInfo['deviceType'] }) {
  // Simple SVG icons — no external dependency
  const className = 'h-5 w-5 text-muted-foreground'

  if (deviceType === 'mobile') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    )
  }

  if (deviceType === 'tablet') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    )
  }

  // Desktop (default)
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

export function SessionCard({ session, onRevoke, isPending }: SessionCardProps) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-4 ${
        session.isCurrent
          ? 'border-primary/50 bg-primary/5'
          : 'border-border bg-card'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <DeviceIcon deviceType={session.deviceType} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {session.browser} — {session.os}
            </span>
            {session.isCurrent && (
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                Session courante
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            {session.ipAddress && <span>IP : {session.ipAddress}</span>}
            {session.ipAddress && <span>&middot;</span>}
            <span>{formatRelativeDate(session.lastActivity)}</span>
          </div>
        </div>
      </div>

      {!session.isCurrent && (
        <button
          onClick={() => onRevoke(session.id)}
          disabled={isPending}
          className="rounded-md border border-destructive/30 px-3 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
        >
          Révoquer
        </button>
      )}
    </div>
  )
}
