'use client'

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query'
import type { ActionResponse } from '@monprojetpro/types'
import type { Notification, CsvImportRow, CsvImportResult } from '../types/crm.types'
import { getNotifications } from '../actions/get-notifications'
import { markNotificationRead } from '../actions/mark-notification-read'
import { importClientsCsv } from '../actions/import-clients-csv'

export function useNotifications(): UseQueryResult<Notification[], Error> {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response: ActionResponse<Notification[]> = await getNotifications()

      if (response.error) {
        throw new Error(response.error.message)
      }

      return response.data ?? []
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  })
}

export function useMarkNotificationRead(): UseMutationResult<
  { id: string },
  Error,
  string
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await markNotificationRead(notificationId)

      if (response.error) {
        throw new Error(response.error.message)
      }

      return response.data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useImportCsv(): UseMutationResult<
  CsvImportResult,
  Error,
  CsvImportRow[]
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rows: CsvImportRow[]) => {
      const response = await importClientsCsv({ rows })

      if (response.error) {
        throw new Error(response.error.message)
      }

      return response.data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
