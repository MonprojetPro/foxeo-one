'use client'

import { useQuery } from '@tanstack/react-query'
import type { ActionResponse } from '@monprojetpro/types'
import type { ValidationRequestDetail } from '../types/validation.types'
import { getValidationRequest } from '../actions/get-validation-request'

export type UseValidationRequestResult = {
  request: ValidationRequestDetail | null
  isLoading: boolean
  error: Error | null
}

export function useValidationRequest(
  requestId: string
): UseValidationRequestResult {
  const { data, isPending, error } = useQuery({
    queryKey: ['validation-request', requestId],
    queryFn: async () => {
      const response: ActionResponse<ValidationRequestDetail> =
        await getValidationRequest(requestId)

      if (response.error) {
        throw new Error(response.error.message)
      }

      return response.data
    },
    staleTime: 1000 * 60, // 1 minute
    enabled: !!requestId,
  })

  return {
    request: data ?? null,
    isLoading: isPending,
    error: error ?? null,
  }
}
