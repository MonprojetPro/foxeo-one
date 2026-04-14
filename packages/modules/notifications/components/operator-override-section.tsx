'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Switch, Skeleton } from '@monprojetpro/ui'
import { showSuccess, showError } from '@monprojetpro/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNotificationPrefs } from '../hooks/use-notification-prefs'
import { setOperatorOverride } from '../actions/set-operator-override'
import { PREFERENCE_NOTIFICATION_TYPES } from '../types/notification-prefs.types'
import { PREF_LABELS } from '../types/notification-prefs-labels'
import type { NotificationType } from '../types/notification.types'
import type { SetOperatorOverrideInput } from '../types/notification-prefs.types'

interface OperatorOverrideSectionProps {
  clientId: string
}

export function OperatorOverrideSection({ clientId }: OperatorOverrideSectionProps) {
  const queryClient = useQueryClient()
  const { data: prefs, isPending } = useNotificationPrefs({
    userId: clientId,
    userType: 'client',
  })

  const overrideMutation = useMutation({
    mutationFn: async (input: SetOperatorOverrideInput) => {
      const result = await setOperatorOverride(input)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-prefs', clientId, 'client'] })
      showSuccess('Override mis à jour')
    },
    onError: (error: Error) => {
      showError(`Erreur : ${error.message}`)
    },
  })

  const prefsMap = new Map(prefs?.map((p) => [p.notificationType, p]))

  if (isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Override notifications client</CardTitle>
        <CardDescription>
          Forcez l'envoi de certaines notifications au client, quelles que soient ses préférences.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {PREFERENCE_NOTIFICATION_TYPES.map((type) => {
          const pref = prefsMap.get(type as NotificationType)
          const isOverridden = pref?.operatorOverride ?? false

          return (
            <div
              key={type}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <span className="text-sm text-foreground">{PREF_LABELS[type].label}</span>
              <Switch
                data-testid={`override-toggle-${type}`}
                checked={isOverridden}
                disabled={overrideMutation.isPending}
                onCheckedChange={(value) =>
                  overrideMutation.mutate({
                    clientId,
                    notificationType: type as NotificationType,
                    operatorOverride: value,
                  })
                }
              />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
