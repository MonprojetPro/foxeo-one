'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'
import { getCoachingInfo, type ClientCoachingInfo } from '../actions/get-coaching-info'

/** Clé TanStack des infos coaching One+ d'un client. */
export const coachingInfoKey = (clientId: string) => ['coaching-info', clientId] as const

/**
 * Infos coaching One+ (solde de crédits + prochaine séance) en TanStack Query.
 * Source : Server Action `getCoachingInfo` (RLS owner). Rafraîchi en Realtime
 * via `useCoachingRealtime` ci-dessous.
 */
export function useCoachingInfo(clientId: string, enabled = true) {
  return useQuery<ClientCoachingInfo, Error>({
    queryKey: coachingInfoKey(clientId),
    queryFn: async () => {
      const result = await getCoachingInfo(clientId)
      if (result.error) throw new Error(result.error.message)
      return (
        result.data ?? { elioTier: null, balance: 0, nextSessionAt: null, nextSessionTitle: null }
      )
    },
    enabled: !!clientId && enabled,
    staleTime: 30_000,
  })
}

/**
 * Abonnement Realtime coaching : écoute `coaching_credit_ledger` (débit/recharge/recrédit)
 * ET `meetings` (réservation/annulation via Cal.com) filtrés sur le client, puis invalide
 * les caches coaching + meetings. Les deux tables sont dans la publication supabase_realtime
 * (migration 20260706120000). Même pattern postgres_changes que les autres hooks de l'app.
 *
 * Passer `undefined` pour désactiver (ex : client non One+).
 */
export function useCoachingRealtime(clientId: string | undefined): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!clientId) return

    const supabase = createBrowserSupabaseClient()

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: coachingInfoKey(clientId) })
      // La carte Visio du cockpit et la page /modules/visio lisent useMeetings(['meetings', …])
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
    }

    const channel = supabase
      .channel(`coaching:${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coaching_credit_ledger',
          filter: `client_id=eq.${clientId}`,
        },
        invalidate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings',
          filter: `client_id=eq.${clientId}`,
        },
        invalidate
      )
      .subscribe()

    window.addEventListener('online', invalidate)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('online', invalidate)
    }
  }, [clientId, queryClient])
}
