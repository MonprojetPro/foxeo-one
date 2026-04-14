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
          queryClient.invalidateQueries({ queryKey: ['notifications', recipientId] })
          queryClient.invalidateQueries({
            queryKey: ['notifications', recipientId, 'unread-count'],
          })
          const newNotif = payload.new as { title?: string; body?: string }
          if (newNotif.title) {
            showInfo(newNotif.title)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [recipientId, queryClient])
}
