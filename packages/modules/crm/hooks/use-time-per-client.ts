'use client'

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ActionResponse } from '@monprojetpro/types'
import type { ClientTimeEstimate } from '../types/crm.types'
import { getTimePerClient } from '../actions/get-time-per-client'

const STATS_STALE_TIME = 1000 * 60 * 10 // 10 minutes

export function useTimePerClient(
  initialData?: ClientTimeEstimate[]
): UseQueryResult<ClientTimeEstimate[], Error> {
  return useQuery({
    queryKey: ['time-per-client'],
    queryFn: async () => {
      const response: ActionResponse<ClientTimeEstimate[]> = await getTimePerClient()

      if (response.error) {
        throw new Error(response.error.message)
      }

      return response.data ?? []
    },
    initialData,
    staleTime: STATS_STALE_TIME,
    refetchOnWindowFocus: false,
  })
}
