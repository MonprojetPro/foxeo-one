'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

/**
 * Abonnement Realtime de la home « Mon Parcours ».
 *
 * La grille des agents/étapes est rendue par `useParcours` (TanStack Query, staleTime 30s) :
 * un `router.refresh()` SSR (RealtimeDashboardRefresh) ne rafraîchit PAS ce cache client.
 * Résultat : couper/réactiver un agent depuis le Hub ne se voyait qu'après rechargement manuel.
 *
 * Ici on invalide la query `['parcours', clientId]` dès qu'un agent du parcours est modifié
 * (client_parcours_agents), que le parcours change, ou qu'une soumission évolue → mise à jour
 * instantanée côté client, sans rechargement.
 */
export function useParcoursRealtimeRefresh(clientId: string | undefined): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!clientId) return

    const supabase = createBrowserSupabaseClient()

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['parcours', clientId] })
    }

    const channel = supabase
      .channel(`parcours-overview-${clientId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'client_parcours_agents', filter: `client_id=eq.${clientId}` },
        invalidate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parcours', filter: `client_id=eq.${clientId}` },
        invalidate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'step_submissions', filter: `client_id=eq.${clientId}` },
        invalidate,
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[PARCOURS:OVERVIEW-REALTIME] Channel error:', err)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clientId, queryClient])
}
