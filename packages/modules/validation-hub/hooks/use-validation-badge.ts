'use client'

import { useQuery } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

export type UseValidationBadgeResult = {
  pendingCount: number
  isLoading: boolean
}

export function useValidationBadge(operatorId: string): UseValidationBadgeResult {
  const supabase = createBrowserSupabaseClient()

  const { data: pendingCount = 0, isPending } = useQuery({
    queryKey: ['validation-badge', operatorId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('validation_requests')
        .select('*', { count: 'exact', head: true })
        .eq('operator_id', operatorId)
        .eq('status', 'pending')

      if (error) {
        console.error('[VALIDATION-HUB:BADGE] Error:', error)
        return 0
      }

      return count ?? 0
    },
    enabled: !!operatorId,
    staleTime: 1000 * 10, // 10 secondes
    refetchInterval: 1000 * 30, // Fallback: refetch toutes les 30s
  })

  return {
    pendingCount,
    isLoading: isPending,
  }
}
