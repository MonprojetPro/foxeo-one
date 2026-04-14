import { useQuery } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

export interface ActivityLogsFilters {
  clientId?: string
  actionType?: string
  actorId?: string
  actorType?: string
  startDate?: string
  endDate?: string
  search?: string
  page?: number
}

export interface ActivityLog {
  id: string
  actorType: string
  actorId: string
  action: string
  entityType: string | null
  entityId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

const PAGE_SIZE = 50

/** Escape special ilike pattern characters to prevent filter manipulation */
function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&')
}

export function useActivityLogs(filters: ActivityLogsFilters = {}) {
  const { clientId, actionType, actorId, actorType, startDate, endDate, search, page = 0 } = filters

  return useQuery({
    queryKey: ['activity-logs', filters],
    queryFn: async (): Promise<{ logs: ActivityLog[]; total: number }> => {
      const supabase = createBrowserSupabaseClient()
      const offset = page * PAGE_SIZE

      let query = supabase
        .from('activity_logs')
        .select('id, actor_type, actor_id, action, entity_type, entity_id, metadata, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      if (clientId) {
        query = query.eq('entity_id', clientId)
      }
      if (actionType) {
        query = query.eq('action', actionType)
      }
      if (actorId) {
        query = query.eq('actor_id', actorId)
      }
      if (actorType) {
        query = query.eq('actor_type', actorType)
      }
      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate)
      }
      if (search) {
        const escaped = escapeIlike(search)
        // Search on action column; metadata search requires text indexing (future enhancement)
        query = query.or(`action.ilike.%${escaped}%`)
      }

      const { data, error, count } = await query

      if (error) throw error

      const logs: ActivityLog[] = (data ?? []).map((row) => ({
        id: row.id,
        actorType: row.actor_type,
        actorId: row.actor_id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        metadata: row.metadata as Record<string, unknown> | null,
        createdAt: row.created_at,
      }))

      return { logs, total: count ?? 0 }
    },
  })
}
