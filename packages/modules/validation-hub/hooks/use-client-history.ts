'use client'

import { useQuery } from '@tanstack/react-query'
import type { ActionResponse } from '@monprojetpro/types'
import type {
  ValidationRequestSummary,
  MessageSummary,
} from '../types/validation.types'
import { getClientPreviousRequests } from '../actions/get-client-previous-requests'
import { getClientRecentMessages } from '../actions/get-client-recent-messages'

export type UseClientHistoryResult = {
  previousRequests: ValidationRequestSummary[]
  recentMessages: MessageSummary[]
  isLoadingRequests: boolean
  isLoadingMessages: boolean
  errorRequests: Error | null
  errorMessages: Error | null
}

export function useClientHistory(
  clientId: string,
  excludeRequestId: string
): UseClientHistoryResult {
  const requestsQuery = useQuery({
    queryKey: ['client-previous-requests', clientId, excludeRequestId],
    queryFn: async () => {
      const response: ActionResponse<ValidationRequestSummary[]> =
        await getClientPreviousRequests(clientId, excludeRequestId)

      if (response.error) {
        throw new Error(response.error.message)
      }

      return response.data ?? []
    },
    staleTime: 1000 * 60,
    enabled: !!clientId && !!excludeRequestId,
  })

  const messagesQuery = useQuery({
    queryKey: ['client-recent-messages', clientId],
    queryFn: async () => {
      const response: ActionResponse<MessageSummary[]> =
        await getClientRecentMessages(clientId)

      if (response.error) {
        throw new Error(response.error.message)
      }

      return response.data ?? []
    },
    staleTime: 1000 * 60,
    enabled: !!clientId,
  })

  return {
    previousRequests: requestsQuery.data ?? [],
    recentMessages: messagesQuery.data ?? [],
    isLoadingRequests: requestsQuery.isPending,
    isLoadingMessages: messagesQuery.isPending,
    errorRequests: requestsQuery.error ?? null,
    errorMessages: messagesQuery.error ?? null,
  }
}
