'use client'

import { useTransition, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { SessionInfo } from '@monprojetpro/utils'
import { revokeSessionAction, revokeOtherSessionsAction } from './actions'
import { SessionCard } from './session-card'

interface SessionListProps {
  sessions: SessionInfo[]
}

export function SessionList({ sessions }: SessionListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const currentSession = sessions.find((s) => s.isCurrent)
  const otherSessions = sessions.filter((s) => !s.isCurrent)
  const hasOtherSessions = otherSessions.length > 0

  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Cleanup toast timer on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  function showToast(message: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToastMessage(message)
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3000)
  }

  function handleRevoke(sessionId: string) {
    startTransition(async () => {
      const { error } = await revokeSessionAction(sessionId)
      if (error) {
        showToast(error.message)
      } else {
        showToast('Session révoquée avec succès')
        router.refresh()
      }
    })
  }

  function handleRevokeAll() {
    if (!currentSession) return
    if (!confirmRevokeAll) {
      setConfirmRevokeAll(true)
      return
    }

    setConfirmRevokeAll(false)
    startTransition(async () => {
      const { data, error } = await revokeOtherSessionsAction(currentSession.id)
      if (error) {
        showToast(error.message)
      } else {
        showToast(`${data?.revokedCount ?? 0} session(s) révoquée(s)`)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed right-4 top-4 z-50 rounded-lg bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* Revoke all others button */}
      {hasOtherSessions && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleRevokeAll}
            disabled={isPending}
            className="rounded-md border border-destructive/50 px-3 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            {confirmRevokeAll
              ? 'Confirmer la révocation'
              : 'Révoquer toutes les autres sessions'}
          </button>
          {confirmRevokeAll && (
            <button
              onClick={() => setConfirmRevokeAll(false)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Annuler
            </button>
          )}
        </div>
      )}

      {/* Current session */}
      {currentSession && (
        <SessionCard
          session={currentSession}
          onRevoke={handleRevoke}
          isPending={isPending}
        />
      )}

      {/* Other sessions */}
      {otherSessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          onRevoke={handleRevoke}
          isPending={isPending}
        />
      ))}

      {sessions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucune session active trouvée.
        </p>
      )}
    </div>
  )
}
