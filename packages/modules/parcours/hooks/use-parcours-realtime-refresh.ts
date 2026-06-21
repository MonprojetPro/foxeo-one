'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

/**
 * Abonnement Realtime de la home « Mon Parcours », via BROADCAST depuis la base
 * (trigger `broadcast_parcours_change` → `realtime.send` sur le canal `parcours:{clientId}`).
 *
 * Pourquoi broadcast et non postgres_changes (RSC-009) : la RLS de `client_parcours_agents`
 * filtre `client_id` via une sous-requête vers `clients`. Realtime applique la RLS par-ligne
 * sur les postgres_changes et n'évalue pas correctement ce type de policy sur les UPDATE →
 * l'event n'était jamais livré (canal SUBSCRIBED mais rien). Le broadcast contourne cette
 * visibilité de ligne : on reçoit un simple signal et on invalide la query (la donnée réelle
 * est re-fetchée via une requête serveur RLS-protégée). Même pattern que les documents.
 *
 * La grille est rendue par `useParcours` (TanStack Query) : un router.refresh() SSR ne la
 * rafraîchit pas → on invalide explicitement ['parcours', clientId].
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
      .channel(`parcours:${clientId}`)
      .on('broadcast', { event: 'parcours_changed' }, invalidate)
      .subscribe((status: string, err?: Error) => {
        if (status === 'SUBSCRIBED') {
          // Rattrape un éventuel changement survenu juste avant l'abonnement.
          invalidate()
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[PARCOURS:REALTIME] Channel error:', err)
        }
      })

    // LOT E — Le mode de parcours (tracé/libre) vit dans client_configs. Une bascule par MiKL
    // qui ne touche AUCUNE étape (ex : re-verrouillage no-op) ne déclenche pas le canal parcours.
    // On écoute donc aussi le broadcast client_configs pour rafraîchir le bandeau + l'état des cartes.
    const configChannel = supabase
      .channel(`client_configs:${clientId}`)
      .on('broadcast', { event: 'client_configs_changed' }, invalidate)
      .subscribe((status: string, err?: Error) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[PARCOURS:REALTIME] client_configs channel error:', err)
        }
      })

    // Reconnexion : rafraîchir au retour en ligne.
    window.addEventListener('online', invalidate)

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(configChannel)
      window.removeEventListener('online', invalidate)
    }
  }, [clientId, queryClient])
}
