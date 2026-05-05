'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

interface RealtimeDashboardRefreshProps {
  operatorId: string
}

export function RealtimeDashboardRefresh({ operatorId }: RealtimeDashboardRefreshProps) {
  const router = useRouter()

  useEffect(() => {
    if (!operatorId) return

    const supabase = createBrowserSupabaseClient()

    // Rafraîchir le dashboard Hub quand un parcours client change de statut
    const channel = supabase
      .channel(`hub-dashboard-refresh:${operatorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parcours',
          filter: `operator_id=eq.${operatorId}`,
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [operatorId, router])

  return null
}
