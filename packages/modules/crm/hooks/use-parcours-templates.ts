'use client'

import { useQuery } from '@tanstack/react-query'
import type { ActionResponse } from '@monprojetpro/types'
import type { ParcoursTemplate } from '../types/crm.types'
import { getParcoursTemplates } from '../actions/get-parcours-templates'

export function useParcoursTemplates() {
  return useQuery({
    queryKey: ['parcours-templates'],
    queryFn: async () => {
      const response: ActionResponse<ParcoursTemplate[]> = await getParcoursTemplates()

      if (response.error) {
        throw new Error(response.error.message)
      }

      return response.data ?? []
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  })
}
