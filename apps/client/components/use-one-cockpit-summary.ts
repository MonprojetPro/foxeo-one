'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'
import {
  getOneCockpitSummary,
  type OneCockpitSummary,
} from '../app/(dashboard)/actions/get-one-cockpit-summary'

/** Clé TanStack du résumé cockpit One. */
export const oneCockpitSummaryKey = (clientId: string) =>
  ['one-cockpit-summary', clientId] as const

/**
 * Résumé cockpit One en TanStack Query (demandes d'évolution en attente + tier + statut outil).
 *
 * Source serveur : `getOneCockpitSummary` (RLS owner → le client ne lit que ses lignes).
 * Branché Realtime via `useOneCockpitSummaryRealtime` ci-dessous (table validation_requests).
 */
export function useOneCockpitSummary(clientId: string) {
  return useQuery({
    queryKey: oneCockpitSummaryKey(clientId),
    queryFn: async (): Promise<OneCockpitSummary> => {
      const { data, error } = await getOneCockpitSummary(clientId)
      if (error) throw new Error(error.message)
      return data ?? { evolutionPendingCount: 0, elioTier: 'one', oneStatus: null }
    },
    enabled: !!clientId,
    staleTime: 30_000,
  })
}

/**
 * Abonnement Realtime du résumé cockpit One.
 *
 * Écoute `validation_requests` filtré sur le client (INSERT/UPDATE) : une nouvelle demande
 * d'évolution soumise via Élio, ou son passage en approved/revision côté Hub, rafraîchit
 * instantanément le compteur « À traiter ». Même pattern postgres_changes que les autres
 * hooks Realtime de l'app (use-chat-realtime, use-suivi-outil-realtime).
 */
export function useOneCockpitSummaryRealtime(clientId: string | undefined): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!clientId) return

    const supabase = createBrowserSupabaseClient()

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: oneCockpitSummaryKey(clientId) })
    }

    const channel = supabase
      .channel(`one-cockpit:${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'validation_requests',
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
