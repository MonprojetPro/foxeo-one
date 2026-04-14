'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'
import { showInfo } from '@monprojetpro/ui'

type RealtimeInsertPayload = {
  new: {
    id?: string
    title?: string
    status?: string
    client_id?: string
  }
  old: Record<string, unknown>
}

type RealtimeUpdatePayload = {
  new: {
    id?: string
    title?: string
    status?: string
    client_id?: string
  }
  old: {
    id?: string
    status?: string
  }
}

export function useValidationRealtime(operatorId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!operatorId) return

    const supabase = createBrowserSupabaseClient()

    const channel = supabase
      .channel(`validation-requests-operator-${operatorId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'validation_requests',
          filter: `operator_id=eq.${operatorId}`,
        },
        (payload) => {
          const insert = payload as unknown as RealtimeInsertPayload
          queryClient.invalidateQueries({ queryKey: ['validation-requests'] })
          queryClient.invalidateQueries({ queryKey: ['validation-badge', operatorId] })
          const title = insert.new.title ?? 'sans titre'
          showInfo(`Nouvelle demande : ${title}`)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'validation_requests',
          filter: `operator_id=eq.${operatorId}`,
        },
        (payload) => {
          const update = payload as unknown as RealtimeUpdatePayload
          queryClient.invalidateQueries({ queryKey: ['validation-requests'] })
          if (update.new.id) {
            queryClient.invalidateQueries({ queryKey: ['validation-request', update.new.id] })
          }
          queryClient.invalidateQueries({ queryKey: ['validation-badge', operatorId] })

          // Toast si re-soumission client (needs_clarification → pending)
          if (
            update.old.status === 'needs_clarification' &&
            update.new.status === 'pending'
          ) {
            showInfo('Un client a répondu à vos précisions')
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[VALIDATION-HUB:REALTIME] Connected')
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('[VALIDATION-HUB:REALTIME] Channel error:', err)
        }
      })

    // AC6 : reconnexion automatique — invalider le cache lors du retour en ligne
    const handleReconnect = () => {
      queryClient.invalidateQueries({ queryKey: ['validation-requests'] })
      queryClient.invalidateQueries({ queryKey: ['validation-badge', operatorId] })
      showInfo('Connexion rétablie — données à jour')
    }

    window.addEventListener('online', handleReconnect)

    // AC7 : cleanup propre lors du démontage
    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('online', handleReconnect)
    }
  }, [operatorId, queryClient])
}
