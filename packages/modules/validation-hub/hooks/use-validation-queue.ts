'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ActionResponse } from '@monprojetpro/types'
import type {
  ValidationRequest,
  ValidationQueueFilters,
} from '../types/validation.types'
import { DEFAULT_VALIDATION_QUEUE_FILTERS } from '../types/validation.types'
import { getValidationRequests } from '../actions/get-validation-requests'

export type UseValidationQueueResult = {
  requests: ValidationRequest[]
  filters: ValidationQueueFilters
  setFilters: (filters: Partial<ValidationQueueFilters>) => void
  isLoading: boolean
  error: Error | null
  pendingCount: number
}

export function useValidationQueue(): UseValidationQueueResult {
  const [filters, setFiltersState] = useState<ValidationQueueFilters>(
    DEFAULT_VALIDATION_QUEUE_FILTERS
  )

  const { data, isPending, error } = useQuery({
    queryKey: ['validation-requests', filters],
    queryFn: async () => {
      const response: ActionResponse<ValidationRequest[]> =
        await getValidationRequests(filters)

      if (response.error) {
        throw new Error(response.error.message)
      }

      return response.data ?? []
    },
    staleTime: 1000 * 30, // 30 secondes
    refetchOnWindowFocus: true,
  })

  const requests = data ?? []
  const pendingCount = requests.filter((r) => r.status === 'pending').length

  const setFilters = (partial: Partial<ValidationQueueFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }))
  }

  return {
    requests,
    filters,
    setFilters,
    isLoading: isPending,
    error: error ?? null,
    pendingCount,
  }
}
