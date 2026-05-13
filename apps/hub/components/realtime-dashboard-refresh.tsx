'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

interface RealtimeDashboardRefreshProps {
  operatorId: string
  authUserId?: string
}

// Debounce simple pour éviter une cascade de router.refresh() (plusieurs INSERT
// arrivent en chaîne lors d'une soumission : step_submissions → validation_requests
// → client_parcours_agents → notifications). On regroupe en un seul refresh.
function createDebouncedRefresh(fn: () => void, delay = 300) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn()
      timer = null
    }, delay)
  }
}

export function RealtimeDashboardRefresh({ operatorId, authUserId }: RealtimeDashboardRefreshProps) {
  const router = useRouter()

  useEffect(() => {
    if (!operatorId) return

    const supabase = createBrowserSupabaseClient()
    const refresh = createDebouncedRefresh(() => router.refresh(), 300)

    // Kit Complet : tout ce qui peut changer un compteur visible sur la home Hub
    // (widget Validations en attente, alertes, suggestions Élio) doit déclencher refresh.
    const channel = supabase
      .channel(`hub-dashboard-refresh:${operatorId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parcours', filter: `operator_id=eq.${operatorId}` },
        refresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'validation_requests', filter: `operator_id=eq.${operatorId}` },
        refresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'step_submissions' },
        // step_submissions n'a pas operator_id — on filtre côté serveur via RLS, le refresh est sur tous les events
        refresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'client_parcours_agents' },
        refresh,
      )
      .subscribe()

    // Canal séparé pour les notifications du user connecté (auth_user_id)
    let notifChannel: ReturnType<typeof supabase.channel> | null = null
    if (authUserId) {
      notifChannel = supabase
        .channel(`hub-notifications-refresh:${authUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${authUserId}`,
          },
          refresh,
        )
        .subscribe()
    }

    return () => {
      supabase.removeChannel(channel)
      if (notifChannel) supabase.removeChannel(notifChannel)
    }
  }, [operatorId, authUserId, router])

  return null
}
