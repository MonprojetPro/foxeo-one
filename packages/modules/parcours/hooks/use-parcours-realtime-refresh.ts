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
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    // SONDE DIAGNOSTIQUE (temporaire) — à retirer une fois la cause confirmée.
    console.log('[PARCOURS-RT] montage hook, clientId =', clientId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invalidate = (payload: any) => {
      console.log('[PARCOURS-RT] event reçu →', payload?.table, payload?.eventType, payload?.new ?? payload)
      queryClient.invalidateQueries({ queryKey: ['parcours', clientId] })
    }

    // CAUSE RACINE (RSC-009) : sur une table RLS, le socket Realtime doit porter le JWT
    // du user, sinon il rejoint en `anon` et la RLS filtre TOUS les events (canal SUBSCRIBED
    // mais aucun message). On applique donc le token AVANT de s'abonner.
    const setup = async () => {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      const token = data.session?.access_token
      console.log('[PARCOURS-RT] token présent ?', Boolean(token))
      if (token) supabase.realtime.setAuth(token)

      channel = supabase
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
          console.log('[PARCOURS-RT] subscribe status =', status, err ?? '')
          if (status === 'CHANNEL_ERROR') {
            console.error('[PARCOURS:OVERVIEW-REALTIME] Channel error:', err)
          }
        })
    }

    void setup()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [clientId, queryClient])
}
