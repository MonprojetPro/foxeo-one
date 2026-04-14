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
  })

  async function triggerRefresh() {
    setRefreshing(true)
    try {
      const supabase = createBrowserSupabaseClient()
      await supabase.functions.invoke('health-check-cron')
      await queryClient.invalidateQueries({ queryKey: ['system-config', 'health-checks'] })
    } catch (err) {
      console.error('[useSystemHealth] Refresh error:', err)
    } finally {
      setRefreshing(false)
    }
  }

  return { ...query, triggerRefresh, refreshing }
}
