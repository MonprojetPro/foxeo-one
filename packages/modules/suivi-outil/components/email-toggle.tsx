'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail, Loader2 } from 'lucide-react'
import { getNotificationPrefs, updateNotificationPrefs } from '@monprojetpro/modules-notifications'

interface EmailToggleProps {
  /** auth_user_id du client (pas le clients.id) */
  userId: string
}

const PREFS_QUERY_KEY = (userId: string) =>
  ['notification-prefs', 'client', userId] as const

export function EmailToggle({ userId }: EmailToggleProps) {
  const queryClient = useQueryClient()

  // Lecture des préférences pour ce client
  const { data: prefsResponse, isPending } = useQuery({
    queryKey: PREFS_QUERY_KEY(userId),
    queryFn: () => getNotificationPrefs({ userId, userType: 'client' }),
    staleTime: 60_000,
    enabled: !!userId,
  })

  const toolUpdatePref = prefsResponse?.data?.find(
    (p) => p.notificationType === 'tool_update'
  )
  // Fail-open : si pas de pref trouvée, email activé par défaut
  const emailEnabled = toolUpdatePref?.channelEmail ?? true

  // Mutation pour mettre à jour
  const { mutate: toggleEmail, isPending: isToggling } = useMutation({
    mutationFn: (enabled: boolean) =>
      updateNotificationPrefs({
        userId,
        userType: 'client',
        notificationType: 'tool_update',
        channelEmail: enabled,
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PREFS_QUERY_KEY(userId) })
    },
  })

  if (isPending) {
    return (
      <div className="flex items-center gap-2 text-white/40">
        <Loader2 size={14} className="animate-spin" />
        <span className="text-xs">Chargement des préférences…</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
      <Mail size={14} className="text-white/50 shrink-0" />
      <span className="text-sm text-white/70 flex-1">
        Recevoir les emails de suivi de l&apos;outil
      </span>
      <button
        role="switch"
        aria-checked={emailEnabled}
        aria-label={
          emailEnabled
            ? "Désactiver les emails de suivi"
            : "Activer les emails de suivi"
        }
        onClick={() => !isToggling && toggleEmail(!emailEnabled)}
        disabled={isToggling}
        className={[
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
          'transition-colors focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-green-500 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          emailEnabled ? 'bg-green-600' : 'bg-white/20',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            emailEnabled ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
      {isToggling && <Loader2 size={12} className="animate-spin text-white/40" />}
    </div>
  )
}
