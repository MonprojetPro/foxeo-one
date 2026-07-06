'use client'

/**
 * Hook — Actions Élio Hub d'une conversation (cartes de validation du chat).
 *
 * TanStack Query (source de vérité serveur) + subscription Realtime sur
 * elio_hub_actions (table dans la publication — migration 20260706123000) :
 * une carte passe de « pending » à « exécutée » sans reload, y compris si la
 * décision vient d'un autre onglet.
 */

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'
import { getElioHubActions } from '../actions/elio-hub-agent'
import type { ElioHubAction } from '../types/elio-hub-agent.types'

export function useElioHubActions(conversationId: string | null): {
  actions: ElioHubAction[]
  isLoading: boolean
  refetch: () => void
} {
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['elio-hub-actions', conversationId],
    queryFn: async () => {
      const { data: actions } = await getElioHubActions(conversationId!)
      return actions ?? []
    },
    enabled: Boolean(conversationId),
    staleTime: 10 * 1000,
  })

  useEffect(() => {
    if (!conversationId) return

    const supabase = createBrowserSupabaseClient()
    const channel = supabase
      .channel(`elio-hub-actions:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'elio_hub_actions',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['elio-hub-actions', conversationId] })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conversationId, queryClient])

  return { actions: data ?? [], isLoading, refetch: () => void refetch() }
}
