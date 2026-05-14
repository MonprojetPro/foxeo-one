'use client'

import { useQuery } from '@tanstack/react-query'
import { getConversations } from '../actions/get-conversations'

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data, error } = await getConversations()
      if (error) throw new Error(error.message)
      return data ?? []
    },
    staleTime: 1000 * 10,
    refetchOnWindowFocus: true,
    // Fallback si la subscription Realtime saute : refetch toutes les 30s
    refetchInterval: 1000 * 30,
  })
}
