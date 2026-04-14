'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ActionResponse } from '@monprojetpro/types'
import type { SupportTicket, UpdateTicketStatusInput } from '../types/support.types'
import { getSupportTickets } from '../actions/get-support-tickets'
import { createSupportTicket } from '../actions/create-support-ticket'
import { updateTicketStatus } from '../actions/update-ticket-status'

export function useSupportTickets(options?: { clientId?: string }) {
  return useQuery({
    queryKey: ['support-tickets', options?.clientId],
    queryFn: async () => {
      const response: ActionResponse<SupportTicket[]> = await getSupportTickets(options)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data ?? []
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  })
}

export function useCreateSupportTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      type: string
      subject: string
      description: string
      screenshotUrl?: string | null
    }) => {
      const response = await createSupportTicket(input)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
    },
  })
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateTicketStatusInput) => {
      const response = await updateTicketStatus(input)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
    },
  })
}
