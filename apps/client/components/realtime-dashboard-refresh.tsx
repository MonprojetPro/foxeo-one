'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

interface RealtimeDashboardRefreshProps {
  clientId: string
}

// Debounce simple pour éviter une cascade de router.refresh() (plusieurs INSERT
// arrivent en chaîne lors d'une soumission : step_submissions → validation_requests
// → client_parcours_agents → notifications). Sans debounce, on déclenche 4 SSR en
// parallèle qui saturent le pool DB Supabase et fait sauter "Connection closed".
function createDebouncedRefresh(fn: () => void, delay = 500) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn()
      timer = null
    }, delay)
  }
}

export function RealtimeDashboardRefresh({ clientId }: RealtimeDashboardRefreshProps) {
  const router = useRouter()

  useEffect(() => {
    if (!clientId) return

    const supabase = createBrowserSupabaseClient()
    const refresh = createDebouncedRefresh(() => router.refresh(), 500)

    const parcoursChannel = supabase
      .channel(`client-dashboard-refresh:${clientId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parcours', filter: `client_id=eq.${clientId}` },
        refresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'client_parcours_agents', filter: `client_id=eq.${clientId}` },
        refresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'validation_requests', filter: `client_id=eq.${clientId}` },
        refresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'step_submissions', filter: `client_id=eq.${clientId}` },
        refresh,
      )
      .subscribe()

    return () => {
      supabase.removeChannel(parcoursChannel)
    }
  }, [clientId, router])

  return null
}
