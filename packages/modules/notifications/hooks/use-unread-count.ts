'use client'

import { useQuery } from '@tanstack/react-query'
import { getUnreadCount } from '../actions/get-unread-count'

export function useUnreadCount(recipientId: string) {
  return useQuery({
    queryKey: ['notifications', recipientId, 'unread-count'],
    queryFn: async () => {
      const response = await getUnreadCount(recipientId)

      if (response.error) {
        throw new Error(response.error.message)
      }

      return response.data?.count ?? 0
    },
    enabled: !!recipientId,
    staleTime: 1000 * 10,
    refetchOnWindowFocus: true,
    // Fallback si la subscription Realtime saute : refetch toutes les 30s
    refetchInterval: 1000 * 30,
  })
}
