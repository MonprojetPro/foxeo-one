'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnalyticsPeriod = '7d' | '30d' | '90d' | '1y'

export interface OverviewStats {
  labClients: number
  oneClients: number
  totalClients: number
  graduationRate: number
  handledRequests: number
}

export interface ModuleUsageStat {
  entityType: string
  count: number
}

export interface ElioStats {
  totalConversations: number
  positiveFeedback: number
  negativeFeedback: number
  conversationsPerDay: number
}

export interface ActiveClientStat {
  actorId: string
  count: number
}

export interface EngagementStats {
  mostActiveClients: ActiveClientStat[]
  inactiveClientIds: string[]
  avgLabDurationDays: number
}

export interface MrrStats {
  mrr: number
  activeSubscriptions: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PERIOD_DAYS: Record<AnalyticsPeriod, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
}

function sinceDate(period: AnalyticsPeriod): string {
  const days = PERIOD_DAYS[period]
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

async function assertOperator() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { supabase: null, error: errorResponse('Non authentifié', 'UNAUTHORIZED') }
  }

  const { data: isOperator } = await supabase.rpc('is_operator')
  if (!isOperator) {
    return { supabase: null, error: errorResponse('Accès réservé aux opérateurs', 'FORBIDDEN') }
  }

  return { supabase, error: null }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Vue d'ensemble : clients actifs par type, taux graduation, demandes traitées
 */
export async function getOverviewStats(
  period: AnalyticsPeriod
): Promise<ActionResponse<OverviewStats>> {
  try {
    const { supabase, error } = await assertOperator()
    if (error) return error as ActionResponse<OverviewStats>

    const since = sinceDate(period)

    // ALL active clients (not filtered by creation date)
    const { data: configs, error: configsErr } = await supabase!
      .from('client_configs')
      .select('dashboard_type, is_active')
      .eq('is_active', true)
      .limit(10000)

    if (configsErr) {
      return errorResponse('Erreur récupération clients', 'DATABASE_ERROR', configsErr)
    }

    const labClients = (configs ?? []).filter(
      (c: { dashboard_type: string }) => c.dashboard_type === 'lab'
    ).length
    const oneClients = (configs ?? []).filter(
      (c: { dashboard_type: string }) => c.dashboard_type === 'one'
    ).length
    const totalClients = labClients + oneClients
    const graduationRate = totalClients > 0 ? Math.round((oneClients / totalClients) * 100) : 0

    // Demandes traitées (validation actions only)
    const VALIDATION_ACTIONS = ['validation_approved', 'validation_rejected', 'validation_clarification_requested']
    const { data: requests, error: reqErr } = await supabase!
      .from('activity_logs')
      .select('id')
      .in('action', VALIDATION_ACTIONS)
      .gte('created_at', since)
      .limit(10000)

    if (reqErr) {
      return errorResponse('Erreur récupération demandes', 'DATABASE_ERROR', reqErr)
    }

    const handledRequests = (requests ?? []).length

    return successResponse({ labClients, oneClients, totalClients, graduationRate, handledRequests })
  } catch (err) {
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', err)
  }
}

/**
 * Classement modules par usage (COUNT par entity_type)
 */
export async function getModuleUsageStats(
  period: AnalyticsPeriod
): Promise<ActionResponse<ModuleUsageStat[]>> {
  try {
    const { supabase, error } = await assertOperator()
    if (error) return error as ActionResponse<ModuleUsageStat[]>

    const since = sinceDate(period)

    const { data: logs, error: logsErr } = await supabase!
      .from('activity_logs')
      .select('entity_type')
      .gte('created_at', since)
      .limit(10000)

    if (logsErr) {
      return errorResponse('Erreur récupération logs', 'DATABASE_ERROR', logsErr)
    }

    // Aggregate by entity_type
    const counts: Record<string, number> = {}
    for (const row of logs ?? []) {
      if (!row.entity_type) continue
      counts[row.entity_type] = (counts[row.entity_type] ?? 0) + 1
    }

    const stats: ModuleUsageStat[] = Object.entries(counts)
      .map(([entityType, count]) => ({ entityType, count }))
      .sort((a, b) => b.count - a.count)

    return successResponse(stats)
  } catch (err) {
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', err)
  }
}

/**
 * Stats Élio : conversations, feedbacks, ratio
 */
export async function getElioStats(
  period: AnalyticsPeriod
): Promise<ActionResponse<ElioStats>> {
  try {
    const { supabase, error } = await assertOperator()
    if (error) return error as ActionResponse<ElioStats>

    const since = sinceDate(period)

    const { data: logs, error: logsErr } = await supabase!
      .from('activity_logs')
      .select('action, metadata, created_at')
      .eq('actor_type', 'elio')
      .gte('created_at', since)
      .limit(10000)

    if (logsErr) {
      return errorResponse('Erreur récupération logs Élio', 'DATABASE_ERROR', logsErr)
    }

    const rows = logs ?? []
    const totalConversations = rows.length
    const positiveFeedback = rows.filter(
      (r: { metadata: Record<string, unknown> | null }) =>
        r.metadata && (r.metadata as Record<string, unknown>)['feedback'] === 'positive'
    ).length
    const negativeFeedback = rows.filter(
      (r: { metadata: Record<string, unknown> | null }) =>
        r.metadata && (r.metadata as Record<string, unknown>)['feedback'] === 'negative'
    ).length

    const days = PERIOD_DAYS[period]
    const conversationsPerDay = Math.round(totalConversations / days)

    return successResponse({ totalConversations, positiveFeedback, negativeFeedback, conversationsPerDay })
  } catch (err) {
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', err)
  }
}

/**
 * Engagement : clients les plus actifs, clients inactifs >7j, durée moyenne parcours Lab
 */
export async function getEngagementStats(
  period: AnalyticsPeriod
): Promise<ActionResponse<EngagementStats>> {
  try {
    const { supabase, error } = await assertOperator()
    if (error) return error as ActionResponse<EngagementStats>

    const since = sinceDate(period)

    const { data: logs, error: logsErr } = await supabase!
      .from('activity_logs')
      .select('actor_id, actor_type')
      .eq('actor_type', 'client')
      .gte('created_at', since)
      .limit(10000)

    if (logsErr) {
      return errorResponse('Erreur récupération engagement', 'DATABASE_ERROR', logsErr)
    }

    // Most active clients
    const counts: Record<string, number> = {}
    for (const row of logs ?? []) {
      counts[row.actor_id] = (counts[row.actor_id] ?? 0) + 1
    }
    const mostActiveClients: ActiveClientStat[] = Object.entries(counts)
      .map(([actorId, count]) => ({ actorId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Inactive clients: all active clients with no logs in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

    // Get ALL active client IDs from client_configs
    const { data: allClients } = await supabase!
      .from('client_configs')
      .select('client_id')
      .eq('is_active', true)
      .limit(10000)

    // Get client IDs with activity in last 7 days
    const { data: recentLogs } = await supabase!
      .from('activity_logs')
      .select('actor_id')
      .eq('actor_type', 'client')
      .gte('created_at', sevenDaysAgo)
      .limit(10000)

    const recentActive = new Set((recentLogs ?? []).map((r: { actor_id: string }) => r.actor_id))
    const inactiveClientIds = (allClients ?? [])
      .map((c: { client_id: string }) => c.client_id)
      .filter((id: string) => !recentActive.has(id))

    return successResponse({
      mostActiveClients,
      inactiveClientIds,
      avgLabDurationDays: 0, // requires graduation data — deferred to future story
    })
  } catch (err) {
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', err)
  }
}

/**
 * MRR depuis billing_sync (si module facturation actif)
 */
export async function getMrrStats(): Promise<ActionResponse<MrrStats>> {
  try {
    const { supabase, error } = await assertOperator()
    if (error) return error as ActionResponse<MrrStats>

    const { data: entries, error: syncErr } = await supabase!
      .from('billing_sync')
      .select('entity_type, data')
      .eq('entity_type', 'subscription')
      .limit(10000)

    if (syncErr) {
      // billing_sync may not exist yet — return empty gracefully
      return successResponse({ mrr: 0, activeSubscriptions: 0 })
    }

    const activeRows = (entries ?? []).filter(
      (r: { data: Record<string, unknown> | null }) =>
        r.data && (r.data as Record<string, unknown>)['status'] === 'active'
    )

    let mrr = 0
    for (const row of activeRows) {
      const d = row.data as Record<string, unknown>
      const amountCents = (d['amount_cents'] as number) ?? 0
      const billingPeriod = (d['billing_period'] as string) ?? 'monthly'
      const monthlyAmount = amountCents / 100
      if (billingPeriod === 'monthly') mrr += monthlyAmount
      else if (billingPeriod === 'quarterly') mrr += monthlyAmount / 3
      else if (billingPeriod === 'yearly') mrr += monthlyAmount / 12
    }

    return successResponse({
      mrr: Math.round(mrr * 100) / 100,
      activeSubscriptions: activeRows.length,
    })
  } catch (err) {
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', err)
  }
}
