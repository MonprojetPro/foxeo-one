'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

/**
 * Realtime "global" pour le badge unread chat de la sidebar.
 *
 * Contrairement à `useChatRealtime(clientId)` qui n'écoute QUE les messages d'une
 * conversation précise (utilisé dans ChatWindow), ce hook écoute TOUS les messages
 * du scope (operator ou client courant) et invalide `['conversations']` pour que
 * le `UnreadBadge` se mette à jour instantanément.
 *
 * Scope :
 * - Hub : passer `{ operatorId }` → écoute filter `operator_id=eq.{...}`
 * - Client : passer `{ clientId }` → écoute filter `client_id=eq.{...}`
 */
export type ConversationsRealtimeScope =
  | { operatorId: string; clientId?: never }
  | { clientId: string; operatorId?: never }

export function useConversationsRealtime(scope: ConversationsRealtimeScope) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const filter =
      'operatorId' in scope && scope.operatorId
        ? `operator_id=eq.${scope.operatorId}`
        : 'clientId' in scope && scope.clientId
          ? `client_id=eq.${scope.clientId}`
          : null

    if (!filter) return

    const supabase = createBrowserSupabaseClient()
    const channelKey =
      'operatorId' in scope && scope.operatorId
        ? `conversations-op:${scope.operatorId}`
        : `conversations-cli:${(scope as { clientId: string }).clientId}`

    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter },
        () => {
          // UPDATE = passage en lu (read_at) → recalculer le compteur
          queryClient.invalidateQueries({ queryKey: ['conversations'] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [
    'operatorId' in scope ? scope.operatorId : undefined,
    'clientId' in scope ? scope.clientId : undefined,
    queryClient,
  ])
}
