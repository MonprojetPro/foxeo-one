'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'

export interface TokenUsageSummary {
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  totalCostEur: number
  weeklyData: Array<{ week: string; tokens: number; costEur: number }>
  topClients: Array<{ clientId: string | null; clientName: string; tokens: number; costEur: number }>
  byAgent: Array<{ agentId: string | null; agentName: string; tokens: number; costEur: number; conversations: number }>
}

/**
 * Agrège la consommation tokens du mois en cours pour le dashboard Hub.
 */
export async function getTokenUsageSummary(): Promise<ActionResponse<TokenUsageSummary>> {
  try {
    const supabase = await createServerSupabaseClient()

    // Début du mois courant
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // 1. Totaux du mois
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: totalsRaw, error: totalsError } = await (supabase as any)
      .from('elio_token_usage')
      .select('input_tokens, output_tokens, cost_eur, created_at, client_id, elio_lab_agent_id, conversation_id')
      .gte('created_at', startOfMonth)
      .limit(50_000) // sécurité — au-delà, migrer vers agrégation SQL

    if (totalsError) {
      return errorResponse('Erreur chargement consommation tokens', 'DATABASE_ERROR', totalsError)
    }

    const rows: Array<{
      input_tokens: number
      output_tokens: number
      cost_eur: number
      created_at: string
      client_id: string | null
      elio_lab_agent_id: string | null
      conversation_id: string | null
    }> = totalsRaw ?? []

    const totalInputTokens = rows.reduce((s, r) => s + (r.input_tokens ?? 0), 0)
    const totalOutputTokens = rows.reduce((s, r) => s + (r.output_tokens ?? 0), 0)
    const totalTokens = totalInputTokens + totalOutputTokens
    const totalCostEur = rows.reduce((s, r) => s + Number(r.cost_eur ?? 0), 0)

    // 2. Tendance hebdomadaire (4 dernières semaines)
    const weeklyMap = new Map<string, { tokens: number; costEur: number }>()
    for (const row of rows) {
      const date = new Date(row.created_at)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekKey = weekStart.toISOString().slice(0, 10)
      const prev = weeklyMap.get(weekKey) ?? { tokens: 0, costEur: 0 }
      weeklyMap.set(weekKey, {
        tokens: prev.tokens + row.input_tokens + row.output_tokens,
        costEur: prev.costEur + Number(row.cost_eur ?? 0),
      })
    }
    const weeklyData = Array.from(weeklyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-4)
      .map(([week, data]) => ({ week, ...data }))

    // 3. Top 5 clients consommateurs
    const clientMap = new Map<string, { tokens: number; costEur: number }>()
    for (const row of rows) {
      const key = row.client_id ?? '__no_client__'
      const prev = clientMap.get(key) ?? { tokens: 0, costEur: 0 }
      clientMap.set(key, {
        tokens: prev.tokens + row.input_tokens + row.output_tokens,
        costEur: prev.costEur + Number(row.cost_eur ?? 0),
      })
    }

    // Résoudre les noms de clients
    const clientIds = Array.from(clientMap.keys()).filter((k) => k !== '__no_client__')
    let clientNames: Record<string, string> = {}

    if (clientIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: clientsData } = await (supabase as any)
        .from('clients')
        .select('id, company_name, full_name')
        .in('id', clientIds)

      if (clientsData) {
        for (const c of clientsData as Array<{ id: string; company_name?: string; full_name?: string }>) {
          clientNames[c.id] = c.company_name ?? c.full_name ?? c.id
        }
      }
    }

    const topClients = Array.from(clientMap.entries())
      .sort(([, a], [, b]) => b.tokens - a.tokens)
      .slice(0, 5)
      .map(([clientId, data]) => ({
        clientId: clientId === '__no_client__' ? null : clientId,
        clientName: clientId === '__no_client__' ? 'Hub (MiKL)' : (clientNames[clientId] ?? clientId),
        ...data,
      }))

    // 4. Répartition par agent
    const agentMap = new Map<string, { tokens: number; costEur: number; conversations: Set<string> }>()
    for (const row of rows) {
      if (!row.elio_lab_agent_id) continue
      const key = row.elio_lab_agent_id
      const prev = agentMap.get(key) ?? { tokens: 0, costEur: 0, conversations: new Set() }
      prev.tokens += row.input_tokens + row.output_tokens
      prev.costEur += Number(row.cost_eur ?? 0)
      if (row.conversation_id) prev.conversations.add(row.conversation_id)
      agentMap.set(key, prev)
    }

    // Résoudre les noms d'agents
    const agentIds = Array.from(agentMap.keys())
    let agentNames: Record<string, string> = {}

    if (agentIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: agentsData } = await (supabase as any)
        .from('elio_lab_agents')
        .select('id, name')
        .in('id', agentIds)

      if (agentsData) {
        for (const a of agentsData as Array<{ id: string; name: string }>) {
          agentNames[a.id] = a.name
        }
      }
    }

    const byAgent = Array.from(agentMap.entries())
      .sort(([, a], [, b]) => b.tokens - a.tokens)
      .map(([agentId, data]) => ({
        agentId,
        agentName: agentNames[agentId] ?? agentId,
        tokens: data.tokens,
        costEur: data.costEur,
        conversations: data.conversations.size,
      }))

    return successResponse<TokenUsageSummary>({
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      totalCostEur,
      weeklyData,
      topClients,
      byAgent,
    })
  } catch (err) {
    console.error('[ELIO:TOKEN_SUMMARY] Unexpected error:', String(err))
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', { message: String(err) })
  }
}
