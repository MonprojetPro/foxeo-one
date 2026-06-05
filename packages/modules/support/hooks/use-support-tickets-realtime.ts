'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

/**
 * Abonnement Realtime sur support_tickets.
 *
 * Corrige le bug « quand MiKL change le statut, ça n'apparaît pas côté client » :
 * la liste client utilisait TanStack (staleTime 2 min + refetch au focus) sans Realtime.
 * La RLS de support_tickets garantit que le client ne reçoit QUE ses propres tickets,
 * donc aucun filtre n'est nécessaire ici — on invalide le cache à chaque changement.
 */
export function useSupportTicketsRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()

    const channel = supabase
      .channel('support-tickets-client')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[SUPPORT:REALTIME] Channel error:', err)
        }
      })

    // Reconnexion : rafraîchir au retour en ligne
    const handleReconnect = () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
    }
    window.addEventListener('online', handleReconnect)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('online', handleReconnect)
    }
  }, [queryClient])
}
