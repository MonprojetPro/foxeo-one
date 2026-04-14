'use client'

import { useQuery } from '@tanstack/react-query'
import type { ActionResponse } from '@monprojetpro/types'
import type { Notification } from '../types/notification.types'
import { getNotifications } from '../actions/get-notifications'

export function useNotifications(recipientId: string) {
  return useQuery({
    queryKey: ['notifications', recipientId],
    queryFn: async () => {
      const response: ActionResponse<Notification[]> = await getNotifications({
        recipientId,
        offset: 0,
        limit: 20,
      })

      if (response.error) {
        throw new Error(response.error.message)
      }

      return response.data ?? []
    },
    enabled: !!recipientId,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  })
}
