'use client'

import { useQuery } from '@tanstack/react-query'
import { getClientToolTrackingSummary } from '../actions/get-client-tool-tracking-summary'

export function useClientToolTrackingSummary(clientId: string) {
  return useQuery({
    queryKey: ['client-tool-tracking-summary', clientId],
    queryFn: async () => {
      const result = await getClientToolTrackingSummary(clientId)
      if (result.error) throw new Error(result.error.message)
      return result.data ?? { postCount: 0, clientCommentCount: 0, lastActivityAt: null }
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 2,
  })
}
