'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { showSuccess, showError } from '@monprojetpro/ui'
import type { NotificationPreference, UpdatePreferenceInput } from '../types/notification-prefs.types'
import { getNotificationPrefs } from '../actions/get-notification-prefs'
import { updateNotificationPrefs } from '../actions/update-notification-prefs'

interface UseNotificationPrefsOptions {
  userId: string
  userType: 'client' | 'operator'
}

export function useNotificationPrefs({ userId, userType }: UseNotificationPrefsOptions) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notification-prefs', userId, userType],
    queryFn: async () => {
      const response = await getNotificationPrefs({ userId, userType })

      if (response.error) {
        throw new Error(response.error.message)
      }

      return (response.data ?? []) as NotificationPreference[]
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })

  const mutation = useMutation({
    mutationFn: async (input: UpdatePreferenceInput) => {
      const response = await updateNotificationPrefs(input)
      if (response.error) {
        throw new Error(response.error.message)
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-prefs', userId, userType] })
      showSuccess('Préférences mises à jour')
    },
    onError: () => {
      showError('Erreur lors de la mise à jour')
    },
  })

  return {
    ...query,
    updatePref: mutation.mutate,
    isUpdating: mutation.isPending,
  }
}
