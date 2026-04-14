'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@monprojetpro/supabase'
import type { PresenceEntry, PresenceStateMap } from '../types/presence.types'

/**
 * Manages the Supabase Realtime Presence channel for a given operator.
 * Tracks own presence and listens for state changes.
 * Must be used inside PresenceProvider — not mounted directly in components.
 *
 * AC1, AC2, AC5
 */
export function useChatPresence(
  operatorId: string,
  userId: string,
  userType: 'client' | 'operator'
): { presenceState: PresenceStateMap } {
  const [presenceState, setPresenceState] = useState<PresenceStateMap>({})

  useEffect(() => {
    if (!operatorId || !userId) return

    const supabase = createClient()

    // AC1: Channel name pattern — presence:operator:{operatorId}
    // AC5: key=userId so Supabase uses 30s heartbeat timeout before marking offline
    const channel = supabase.channel(`presence:operator:${operatorId}`, {
      config: { presence: { key: userId } },
    })

    function syncState() {
      const state = channel.presenceState<PresenceEntry>()
      setPresenceState({ ...state })
    }

    channel
      .on('presence', { event: 'sync' }, syncState)
      .on('presence', { event: 'join' }, syncState)
      .on('presence', { event: 'leave' }, syncState)
      .subscribe(async (status) => {
        // AC2: Track own presence once subscribed
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            user_type: userType,
            online_at: new Date().toISOString(),
          })
        }
      })

    // AC2 + AC3: Cleanup removes presence when page closes or unmounts
    return () => {
      supabase.removeChannel(channel)
    }
  }, [operatorId, userId, userType])

  return { presenceState }
}
