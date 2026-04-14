'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { PortfolioStats as PortfolioStatsSchema } from '../types/crm.types'
import type { PortfolioStats } from '../types/crm.types'

export async function getPortfolioStats(): Promise<ActionResponse<PortfolioStats>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    // Lookup operator record (operators.id ≠ auth.uid())
    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    const operatorId = operator.id

    const { data, error } = await supabase
      .from('clients')
      .select('id, client_type, status, client_configs(dashboard_type)')
      .eq('operator_id', operatorId)

    if (error) {
      console.error('[CRM:GET_STATS] Supabase error:', error)
      return errorResponse(
        'Impossible de charger les statistiques',
        'DATABASE_ERROR',
        error
      )
    }

    const clients = data ?? []

    // Aggregate by status
    const byStatus = {
      active: 0,
      archived: 0,
      suspended: 0,
    }

    for (const client of clients) {
      if (client.status === 'active') {
        byStatus.active++
      } else if (client.status === 'archived') {
        byStatus.archived++
      } else if (client.status === 'suspended') {
        byStatus.suspended++
      }
    }

    // Aggregate by client_type — HISTORICAL label (commercial origin).
    // Kept for backwards compatibility with existing Hub widgets (ADR-01 Rev 2).
    const byType = {
      complet: 0,
      directOne: 0,
      ponctuel: 0,
    }

    for (const client of clients) {
      if (client.client_type === 'complet') {
        byType.complet++
      } else if (client.client_type === 'direct_one') {
        byType.directOne++
      } else if (client.client_type === 'ponctuel') {
        byType.ponctuel++
      }
    }

    // Aggregate by client_configs.dashboard_type — SOURCE OF TRUTH for
    // current dashboard state (lab vs one). Supabase returns the joined
    // `client_configs` relation as either an object, an array, or null.
    type ClientConfigJoin = { dashboard_type: string | null } | null
    type ClientRow = typeof clients[number] & {
      client_configs: ClientConfigJoin | ClientConfigJoin[]
    }

    const resolveDashboardType = (row: ClientRow): string | null => {
      const rel = row.client_configs
      if (!rel) return null
      if (Array.isArray(rel)) return rel[0]?.dashboard_type ?? null
      return rel.dashboard_type ?? null
    }

    const byDashboardType = {
      lab: 0,
      one: 0,
    }

    let labActive = 0
    let oneActive = 0

    for (const client of clients as ClientRow[]) {
      const dashboardType = resolveDashboardType(client)
      if (dashboardType === 'lab') {
        byDashboardType.lab++
        if (client.status === 'active') labActive++
      } else if (dashboardType === 'one') {
        byDashboardType.one++
        if (client.status === 'active') oneActive++
      }
    }

    const stats = PortfolioStatsSchema.parse({
      totalClients: clients.length,
      byStatus,
      byType,
      byDashboardType,
      labActive,
      oneActive,
      mrr: { available: false, message: 'Module Facturation requis' },
    })

    return successResponse(stats)
  } catch (error) {
    console.error('[CRM:GET_STATS] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      error
    )
  }
}
