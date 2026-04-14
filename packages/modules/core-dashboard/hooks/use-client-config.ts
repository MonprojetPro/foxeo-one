'use client'

import { useQuery } from '@tanstack/react-query'
import type { ClientConfig } from '@monprojetpro/types'
import { getClientConfig } from '../actions/get-client-config'

/**
 * TanStack Query hook — Fetche la configuration client.
 * queryKey: ['client-config', clientId]
 * Stale time: 5 minutes (config peu volatile)
 */
export function useClientConfig(clientId: string) {
  return useQuery<ClientConfig | null>({
    queryKey: ['client-config', clientId],
    queryFn: async () => {
      if (!clientId) return null
      const { data, error } = await getClientConfig(clientId)
      if (error) {
        throw new Error(error.message)
      }
      return data
    },
    enabled: Boolean(clientId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
