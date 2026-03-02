'use client'

import { useQuery } from '@tanstack/react-query'
import { getConversations } from '../actions/get-conversations'
import type { DashboardType, ElioConversation } from '../types/elio.types'

const STALE_TIME = 5 * 60 * 1000 // 5 minutes

interface UseElioConversationsOptions {
  userId: string
  dashboardType: DashboardType
  enabled?: boolean
}

interface UseElioConversationsReturn {
  conversations: ElioConversation[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook — Liste des conversations Élio d'un utilisateur.
 * QueryKey: ['elio-conversations', userId, dashboardType]
 * Triées par updated_at DESC (gérée côté serveur).
 */
export function useElioConversations({
  userId,
  dashboardType,
  enabled = true,
}: UseElioConversationsOptions): UseElioConversationsReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['elio-conversations', userId, dashboardType],
    queryFn: () => getConversations(dashboardType),
    enabled: Boolean(userId) && enabled,
    staleTime: STALE_TIME,
    select: (result) => result.data ?? [],
  })

  return {
    conversations: data ?? [],
    isLoading,
    error: error ? String(error) : null,
    refetch,
  }
}
