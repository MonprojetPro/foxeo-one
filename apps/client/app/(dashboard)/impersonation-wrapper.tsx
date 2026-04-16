'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ImpersonationBanner } from '@monprojetpro/ui'
import { endImpersonationClient } from './actions/end-impersonation-client'

const COOKIE_NAME = 'mpro-impersonation-session'

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`
}

interface SessionData {
  sessionId: string
  expiresAt: string
}

export function ImpersonationWrapper({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for session from URL param (initial redirect from Hub)
    const urlSessionId = searchParams.get('impersonation_session')
    if (urlSessionId) {
      const sessionData: SessionData = {
        sessionId: urlSessionId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }
      document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(sessionData))}; path=/; max-age=3600; SameSite=Lax`
      setSession(sessionData)

      // Clean URL params
      const url = new URL(window.location.href)
      url.searchParams.delete('impersonation_session')
      window.history.replaceState({}, '', url.toString())
      return
    }

    // Check for existing cookie
    const cookieValue = getCookie(COOKIE_NAME)
    if (cookieValue) {
      try {
        const data = JSON.parse(cookieValue) as SessionData
        if (new Date(data.expiresAt) > new Date()) {
          setSession(data)
        } else {
          deleteCookie(COOKIE_NAME)
        }
      } catch {
        deleteCookie(COOKIE_NAME)
      }
    }
  }, [searchParams])

  const handleEndSession = async () => {
    if (!session) return

    try {
      await endImpersonationClient(session.sessionId)
    } catch (error) {
      console.error('[IMPERSONATION:END] Error:', error)
    }

    deleteCookie(COOKIE_NAME)
    setSession(null)

    // Redirect to Hub
    const hubUrl = process.env.NEXT_PUBLIC_HUB_URL ?? 'http://localhost:3002'
    window.location.href = hubUrl
  }

  return (
    <>
      {session && (
        <ImpersonationBanner
          sessionId={session.sessionId}
          onEndSession={handleEndSession}
        />
      )}
      {children}
    </>
  )
}
