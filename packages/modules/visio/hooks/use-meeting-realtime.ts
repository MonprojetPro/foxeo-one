'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useMeetingRealtime(meetingId: string) {
  const [operatorJoined, setOperatorJoined] = useState(false)
  const [clientWaiting, setClientWaiting] = useState(false)
  const supabaseRef = useRef(createBrowserSupabaseClient())
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const supabase = supabaseRef.current
    const channel = supabase.channel(`meeting:${meetingId}:status`)
    channelRef.current = channel

    channel
      .on('broadcast', { event: 'operator_joined' }, () => {
        setOperatorJoined(true)
      })
      .on('broadcast', { event: 'client_waiting' }, () => {
        setClientWaiting(true)
      })
      .subscribe()

    return () => {
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [meetingId])

  const broadcastClientWaiting = useCallback(async () => {
    const channel = channelRef.current
    if (!channel) return
    await channel.send({
      type: 'broadcast',
      event: 'client_waiting',
      payload: { timestamp: new Date().toISOString() },
    })
  }, [])

  const broadcastOperatorJoined = useCallback(async () => {
    const channel = channelRef.current
    if (!channel) return
    await channel.send({
      type: 'broadcast',
      event: 'operator_joined',
      payload: { timestamp: new Date().toISOString() },
    })
  }, [])

  return { operatorJoined, clientWaiting, broadcastClientWaiting, broadcastOperatorJoined }
}
