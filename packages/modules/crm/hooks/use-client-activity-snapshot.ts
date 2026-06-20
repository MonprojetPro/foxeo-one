'use client'

import { useQuery } from '@tanstack/react-query'
import { getClientActivitySnapshot } from '../actions/get-client-activity-snapshot'

export function useClientActivitySnapshot(clientId: string) {
  return useQuery({
    queryKey: ['client-activity-snapshot', clientId],
    queryFn: async () => {
      const result = await getClientActivitySnapshot(clientId)
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 2,
  })
}
