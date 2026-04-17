'use client'

import { useQuery } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

export type UsePendingRemindersCountResult = {
  pendingCount: number
  isLoading: boolean
}

export function usePendingRemindersCount(): UsePendingRemindersCountResult {
  const supabase = createBrowserSupabaseClient()

  const { data: pendingCount = 0, isPending } = useQuery({
    queryKey: ['billing', 'reminders', 'pending-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('collection_reminders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      if (error) {
        console.error('[BILLING:REMINDERS:BADGE] Error:', error)
        return 0
      }

      return count ?? 0
    },
    staleTime: 1000 * 30, // 30 secondes
    refetchInterval: 1000 * 60, // Refetch toutes les 60s
  })

  return {
    pendingCount,
    isLoading: isPending,
  }
}
