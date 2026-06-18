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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `client_id=eq.${clientId}` },
        refresh,
      )
      // Accès Lab/One, modules actifs, Élio Lab, graduation : tout vit dans client_configs,
      // lu en SSR par le layout client. Sans cette écoute, un changement opéré depuis le Hub
      // ne se voyait qu'après un rechargement manuel (thème, sidebar, toggle Mode, Élio Lab).
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'client_configs', filter: `client_id=eq.${clientId}` },
        refresh,
      )
      .subscribe()

    // ⚠️ RSC-009 : la RLS de client_configs (et parcours/agents) référence d'autres tables
    // → Realtime ne délivre PAS les UPDATE postgres_changes ci-dessus. On double donc avec un
    // BROADCAST DB (triggers broadcast_*_change → realtime.send) qui, lui, passe toujours.
    // Couper le Lab globalement (elio_lab_enabled), graduation, modules… → router.refresh() en direct.
    const broadcastChannel = supabase
      .channel(`client_configs:${clientId}`)
      .on('broadcast', { event: 'client_configs_changed' }, refresh)
      .subscribe()

    const parcoursBroadcast = supabase
      .channel(`parcours:${clientId}`)
      .on('broadcast', { event: 'parcours_changed' }, refresh)
      .subscribe()

    return () => {
      supabase.removeChannel(parcoursChannel)
      supabase.removeChannel(broadcastChannel)
      supabase.removeChannel(parcoursBroadcast)
    }
  }, [clientId, router])

  return null
}
