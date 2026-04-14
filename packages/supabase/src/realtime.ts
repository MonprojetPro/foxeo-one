import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@monprojetpro/types'

export const CHANNEL_PATTERNS = {
  clientNotifications: (clientId: string) =>
    `client:notifications:${clientId}`,
  chatRoom: (clientId: string) => `chat:room:${clientId}`,
  presence: (operatorId: string) => `presence:operator:${operatorId}`,
  clientConfig: (clientId: string) => `client:config:${clientId}`,
} as const

export type ChannelEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

export function subscribeToChanges(
  supabase: SupabaseClient<Database>,
  channel: string,
  table: string,
  event: ChannelEvent,
  callback: (payload: unknown) => void
) {
  return supabase
    .channel(channel)
    .on('postgres_changes', { event, schema: 'public', table }, callback)
    .subscribe()
}
