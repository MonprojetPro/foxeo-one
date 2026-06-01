'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

/**
 * Abonnement Realtime sur le statut de l'étape (`client_parcours_agents`) et ses soumissions
 * (`step_submissions`), filtrés sur l'étape courante.
 *
 * `step.status` est une prop rendue côté serveur (SSR) : sans ça, un renvoi/validation déclenché
 * depuis le Hub ne se voit qu'au rechargement. À chaque changement, on appelle `router.refresh()`
 * pour re-rendre le serveur (statut frais → bandeaux + bouton à jour instantanément) et on invalide
 * les caches TanStack du panneau historique / bandeau de soumission.
 */
export function useStepRealtimeRefresh(stepId: string | undefined): void {
  const router = useRouter()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!stepId) return

    const supabase = createBrowserSupabaseClient()

    const refresh = () => {
      router.refresh()
      queryClient.invalidateQueries({ queryKey: ['step-submission-status', stepId] })
      queryClient.invalidateQueries({ queryKey: ['step-history-submissions', stepId] })
    }

    const channel = supabase
      .channel(`step-status-${stepId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'client_parcours_agents',
          filter: `id=eq.${stepId}`,
        },
        refresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'step_submissions',
          filter: `parcours_step_id=eq.${stepId}`,
        },
        refresh,
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[PARCOURS:STEP-STATUS-REALTIME] Channel error:', err)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [stepId, router, queryClient])
}
