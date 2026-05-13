'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

interface RealtimeDashboardRefreshProps {
  clientId: string
}

export function RealtimeDashboardRefresh({ clientId }: RealtimeDashboardRefreshProps) {
  const router = useRouter()

  useEffect(() => {
    if (!clientId) return

    const supabase = createBrowserSupabaseClient()

    // Rafraîchir le dashboard client quand le parcours, les étapes ou les demandes de validation changent
    const parcoursChannel = supabase
      .channel(`client-dashboard-refresh:${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parcours',
          filter: `client_id=eq.${clientId}`,
        },
        () => { router.refresh() }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_parcours_agents',
          filter: `client_id=eq.${clientId}`,
        },
        () => { router.refresh() }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'validation_requests',
          filter: `client_id=eq.${clientId}`,
        },
        () => { router.refresh() }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'step_submissions',
          filter: `client_id=eq.${clientId}`,
        },
        () => { router.refresh() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(parcoursChannel)
    }
  }, [clientId, router])

  return null
}
