'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'
import { showInfo } from '@monprojetpro/ui'

export function useNotificationsRealtime(recipientId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!recipientId) return

    // createBrowserSupabaseClient is a singleton — safe to call in useEffect
    const supabase = createBrowserSupabaseClient()

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', recipientId] })
      queryClient.invalidateQueries({
        queryKey: ['notifications', recipientId, 'unread-count'],
      })
    }

    const channel = supabase
      .channel(`notifications:${recipientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${recipientId}`,
        },
        (payload) => {
          invalidate()
          const newNotif = payload.new as { title?: string; body?: string }
          if (newNotif.title) {
            showInfo(newNotif.title)
          }
        }
      )
      // UPDATE (ex: marquage lu) et DELETE (ex: auto-résolution d'une alerte
      // système rétablie par le cron) — la cloche se met à jour sans refresh.
      // DELETE nécessite REPLICA IDENTITY FULL sur la table (cf. migration).
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${recipientId}`,
        },
        invalidate
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${recipientId}`,
        },
        invalidate
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [recipientId, queryClient])
}
