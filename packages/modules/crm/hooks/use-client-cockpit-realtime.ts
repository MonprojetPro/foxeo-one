'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

/**
 * Rafraîchit le cockpit Hub en direct quand le client bouge (soumission, validation,
 * progression). Écoute le BROADCAST `parcours:{clientId}` émis par les triggers DB
 * (`broadcast_parcours_change` sur client_parcours_agents / parcours / step_submissions —
 * cf. RSC-009). Une nouvelle soumission insère un `step_submission` → broadcast → on invalide
 * les 3 lectures du cockpit. Canal public (private=false) : l'opérateur peut s'y abonner.
 */
export function useClientCockpitRealtime(clientId: string | undefined): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!clientId) return

    const supabase = createBrowserSupabaseClient()

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['client-parcours', clientId] })
      queryClient.invalidateQueries({ queryKey: ['client-activity-snapshot', clientId] })
      queryClient.invalidateQueries({ queryKey: ['client-pending-validations', clientId] })
    }

    const channel = supabase
      .channel(`parcours:${clientId}`)
      .on('broadcast', { event: 'parcours_changed' }, invalidate)
      .subscribe((status: string, err?: Error) => {
        if (status === 'SUBSCRIBED') {
          // Rattrape un changement survenu juste avant l'abonnement.
          invalidate()
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[COCKPIT:REALTIME] Channel error:', err)
        }
      })

    window.addEventListener('online', invalidate)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('online', invalidate)
    }
  }, [clientId, queryClient])
}
