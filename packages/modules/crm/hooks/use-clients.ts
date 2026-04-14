'use client'

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ActionResponse } from '@monprojetpro/types'
import type { ClientListItem, ClientFilters } from '../types/crm.types'
import { getClients } from '../actions/get-clients'

export function useClients(
  filters?: ClientFilters,
  initialData?: ClientListItem[]
): UseQueryResult<ClientListItem[], Error> {
  return useQuery({
    queryKey: ['clients', filters],
    queryFn: async () => {
      const response: ActionResponse<ClientListItem[]> = await getClients(filters)

      if (response.error) {
        throw new Error(response.error.message)
      }

      return response.data ?? []
    },
    initialData,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  })
}
