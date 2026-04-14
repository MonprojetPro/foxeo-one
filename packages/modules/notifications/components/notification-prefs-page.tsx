'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@monprojetpro/ui'
import { PrefToggleRow } from './pref-toggle-row'
import { useNotificationPrefs } from '../hooks/use-notification-prefs'
import { CRITICAL_INAPP_TYPES, type NotificationPreferenceType } from '../types/notification-prefs.types'
import { PREF_LABELS } from '../types/notification-prefs-labels'
import type { NotificationType } from '../types/notification.types'

interface NotificationPrefsPageProps {
  userId: string
  userType: 'client' | 'operator'
}

export function NotificationPrefsPage({ userId, userType }: NotificationPrefsPageProps) {
  const { data: prefs, isPending, updatePref } = useNotificationPrefs({ userId, userType })

  if (isPending) {
    return (
      <div data-testid="prefs-skeleton" className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  const prefsMap = new Map(prefs?.map((p) => [p.notificationType, p]))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Notifications</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choisissez les types de notifications que vous souhaitez recevoir et par quel canal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Canaux de notification</CardTitle>
          <CardDescription>
            Activez ou désactivez chaque type de notification par canal (email ou in-app).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end gap-6 mb-2 pr-1">
            <span className="text-xs font-medium text-muted-foreground w-14 text-center">Email</span>
            <span className="text-xs font-medium text-muted-foreground w-14 text-center">In-app</span>
          </div>

          {(Object.keys(PREF_LABELS) as NotificationPreferenceType[]).map((type) => {
            const pref = prefsMap.get(type as NotificationType)
            const meta = PREF_LABELS[type]
            const isCritical = CRITICAL_INAPP_TYPES.includes(type)

            return (
              <PrefToggleRow
                key={type}
                label={meta.label}
                description={meta.description}
                notificationType={type as NotificationType}
                channelEmail={pref?.channelEmail ?? true}
                channelInapp={pref?.channelInapp ?? true}
                isCriticalInapp={isCritical}
                onToggleEmail={(value) =>
                  updatePref({
                    userId,
                    userType,
                    notificationType: type as NotificationType,
                    channelEmail: value,
                  })
                }
                onToggleInapp={(value) =>
                  updatePref({
                    userId,
                    userType,
                    notificationType: type as NotificationType,
                    channelInapp: value,
                  })
                }
              />
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
