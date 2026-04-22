'use client'

import { useQuery } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

/**
 * Hook client — Compte les injections non lues par step_id pour un client.
 * Retourne un Record<stepId, count> utilisé par les cartes étape pour afficher un badge.
 */
export function useUnreadInjections(clientId: string): {
  unreadByStep: Record<string, number>
  isLoading: boolean
} {
  const { data, isLoading } = useQuery<Record<string, number>>({
    queryKey: ['unread-injections', clientId],
    queryFn: async () => {
      if (!clientId) return {}
      const supabase = createBrowserSupabaseClient()

      const { data: injections, error } = await supabase
        .from('step_feedback_injections')
        .select('step_id')
        .eq('client_id', clientId)
        .is('read_at', null)

      if (error || !injections) return {}

      // Grouper par step_id et compter
      const counts: Record<string, number> = {}
      for (const row of injections) {
        counts[row.step_id] = (counts[row.step_id] ?? 0) + 1
      }
      return counts
    },
    enabled: Boolean(clientId),
    staleTime: 30_000,
  })

  return {
    unreadByStep: data ?? {},
    isLoading,
  }
}
