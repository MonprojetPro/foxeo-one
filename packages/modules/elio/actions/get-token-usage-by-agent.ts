'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'

export interface AgentTokenDetail {
  agentId: string
  agentName: string
  totalTokens: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCostEur: number
  conversationCount: number
  avgTokensPerConversation: number
}

/**
 * Retourne le détail de consommation tokens pour un agent Élio Lab spécifique (mois en cours).
 */
export async function getTokenUsageByAgent(
  agentId: string,
): Promise<ActionResponse<AgentTokenDetail>> {
  try {
    if (!agentId) {
      return errorResponse('agentId requis', 'VALIDATION_ERROR')
    }

    const supabase = await createServerSupabaseClient()
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    ).toISOString()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error: rowsError } = await (supabase as any)
      .from('elio_token_usage')
      .select('input_tokens, output_tokens, cost_eur, conversation_id')
      .eq('elio_lab_agent_id', agentId)
      .gte('created_at', startOfMonth)

    if (rowsError) {
      return errorResponse('Erreur chargement détail agent', 'DATABASE_ERROR', rowsError)
    }

    const typedRows: Array<{
      input_tokens: number
      output_tokens: number
      cost_eur: number
      conversation_id: string | null
    }> = rows ?? []

    const totalInputTokens = typedRows.reduce((s, r) => s + r.input_tokens, 0)
    const totalOutputTokens = typedRows.reduce((s, r) => s + r.output_tokens, 0)
    const totalTokens = totalInputTokens + totalOutputTokens
    const totalCostEur = typedRows.reduce((s, r) => s + Number(r.cost_eur ?? 0), 0)
    const uniqueConvs = new Set(typedRows.map((r) => r.conversation_id).filter(Boolean))
    const conversationCount = uniqueConvs.size
    const avgTokensPerConversation =
      conversationCount > 0 ? Math.round(totalTokens / conversationCount) : 0

    // Le nom de l'agent est résolu côté appelant depuis le résumé (pas de 2ème requête)
    return successResponse<AgentTokenDetail>({
      agentId,
      agentName: agentId, // Le composant résout le nom depuis `byAgent` passé en props
      totalTokens,
      totalInputTokens,
      totalOutputTokens,
      totalCostEur,
      conversationCount,
      avgTokensPerConversation,
    })
  } catch (err) {
    console.error('[ELIO:TOKEN_BY_AGENT] Unexpected error:', String(err))
    return errorResponse('Erreur inattendue', 'INTERNAL_ERROR', { message: String(err) })
  }
}
