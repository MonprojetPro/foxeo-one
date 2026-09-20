'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

// Re-export types from the canonical source (Edge Function logic file)
// Note: These types are duplicated here rather than imported from supabase/functions/
// because workspace modules cannot import from Deno Edge Functions.
// Kept in sync manually — canonical definition: supabase/functions/health-check-cron/health-check-logic.ts

export type ServiceStatus = 'ok' | 'degraded' | 'error'
export type GlobalStatus = 'ok' | 'degraded' | 'error'

export interface ServiceCheck {
  status: ServiceStatus
  latencyMs: number
  error?: string
}

export interface HealthCheckData {
  checkedAt: string
  services: Record<string, ServiceCheck>
  globalStatus: GlobalStatus
}

export function useSystemHealth() {
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  // Échec du rafraîchissement manuel, remonté à l'écran (2026-09-20).
  // Avant, l'erreur partait dans un console.error : le bouton « Rafraîchir » pouvait
  // échouer sans que rien ne le dise, et l'écran restait figé sur un vieux snapshot
  // affiché comme l'état courant. Un bouton muet rend le monitoring indiagnosticable.
  const [refreshError, setRefreshError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['system-config', 'health-checks'],
    queryFn: async (): Promise<HealthCheckData | null> => {
      const supabase = createBrowserSupabaseClient()
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'health_checks')
        .single()

      if (error) throw error

      const value = data?.value
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null
      if (!('globalStatus' in value)) return null

      return value as HealthCheckData
    },
    refetchInterval: 5 * 60 * 1000, // Rafraîchissement auto toutes les 5 min
    // Sans ça, TanStack suspend le timer quand l'onglet n'a pas le focus : l'écran
    // reste figé sur un vieux snapshot présenté comme l'état courant.
    refetchIntervalInBackground: true,
  })

  async function triggerRefresh() {
    setRefreshing(true)
    setRefreshError(null)
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.functions.invoke('health-check-cron')
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: ['system-config', 'health-checks'] })
    } catch (err) {
      console.error('[useSystemHealth] Refresh error:', err)
      setRefreshError(
        err instanceof Error ? err.message : 'Échec de la vérification — état non rafraîchi.'
      )
    } finally {
      setRefreshing(false)
    }
  }

  return { ...query, triggerRefresh, refreshing, refreshError }
}
