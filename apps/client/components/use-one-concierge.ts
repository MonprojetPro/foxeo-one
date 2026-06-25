'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'
import { getOneConciergeWord, type ConciergeWord } from '@monprojetpro/module-elio'

/** Clé TanStack du « dernier mot d'Élio » côté One. */
export const oneConciergeWordKey = (clientId: string) =>
  ['one-concierge-word', clientId] as const

/**
 * « Le dernier mot d'Élio » côté One, en TanStack Query.
 *
 * - Source serveur : `getOneConciergeWord(clientId)` (contrat @monprojetpro/module-elio →
 *   lit client_concierge_messages, dashboard_context='one'). Source unique de vérité.
 * - Hydratation : le mot est aussi fetché en SSR (page.tsx) et passé en `initialData` pour
 *   éviter un flash de skeleton à l'arrivée. Le hook prend le relais pour le temps réel.
 * - Le rafraîchissement Realtime est branché par `useOneConciergeRealtime` (canal dédié).
 */
export function useOneConciergeWord(
  clientId: string,
  initialWord: ConciergeWord | null,
) {
  return useQuery({
    queryKey: oneConciergeWordKey(clientId),
    queryFn: async (): Promise<ConciergeWord | null> => {
      const word = await getOneConciergeWord(clientId)
      return word
    },
    enabled: !!clientId,
    // SSR fournit le premier mot → pas de skeleton au premier rendu.
    initialData: initialWord,
    staleTime: 60_000, // Realtime invalide au besoin ; on évite le refetch au focus.
  })
}

/**
 * Abonnement Realtime du « mot d'Élio » côté One.
 *
 * Canal `one:{clientId}`, event `one_concierge_changed` — poussé par le trigger DB
 * `trg_broadcast_one_concierge_messages` (migration 20260625120000) UNIQUEMENT pour les rows
 * dashboard_context='one'. Même pattern que `useParcoursRealtimeRefresh` (broadcast DB pour
 * contourner la RLS par sous-requête, RSC-009) : on reçoit un signal et on invalide la query,
 * la donnée réelle étant re-fetchée via le Server Action RLS-protégé.
 */
export function useOneConciergeRealtime(clientId: string | undefined): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!clientId) return

    const supabase = createBrowserSupabaseClient()

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: oneConciergeWordKey(clientId) })
    }

    const channel = supabase
      .channel(`one:${clientId}`)
      .on('broadcast', { event: 'one_concierge_changed' }, invalidate)
      .subscribe((status: string, err?: Error) => {
        if (status === 'SUBSCRIBED') {
          // Rattrape un mot survenu juste avant l'abonnement.
          invalidate()
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[ONE:CONCIERGE:REALTIME] Channel error:', err)
        }
      })

    // Reconnexion : rafraîchir au retour en ligne.
    window.addEventListener('online', invalidate)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('online', invalidate)
    }
  }, [clientId, queryClient])
}
