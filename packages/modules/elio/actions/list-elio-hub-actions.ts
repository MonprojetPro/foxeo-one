'use server'

/**
 * Historique global des actions Élio Hub (onglet /elio/hub — T5 Pilotage).
 *
 * Contrairement à getElioHubActions (scopé à une conversation, pour les cartes
 * du chat), cette action liste TOUTES les actions de l'opérateur, toutes
 * conversations confondues, les plus récentes en premier. RLS elio_hub_actions
 * (is_operator(operator_id)) + check applicatif opérateur.
 */

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import type { ElioHubAction } from '../types/elio-hub-agent.types'

const HISTORY_LIMIT = 100

/**
 * Mapping manuel snake_case → camelCase (même règle que elio-hub-agent.ts :
 * pas de toCamelCase, il transformerait aussi les clés du JSONB tool_input).
 */
function rowToHubAction(row: Record<string, unknown>): ElioHubAction {
  return {
    id: row.id as string,
    operatorId: row.operator_id as string,
    conversationId: (row.conversation_id as string | null) ?? null,
    toolName: row.tool_name as string,
    toolInput: (row.tool_input as Record<string, unknown>) ?? {},
    summary: row.summary as string,
    status: row.status as ElioHubAction['status'],
    result: (row.result as Record<string, unknown> | null) ?? null,
    error: (row.error as string | null) ?? null,
    createdAt: row.created_at as string,
    decidedAt: (row.decided_at as string | null) ?? null,
    executedAt: (row.executed_at as string | null) ?? null,
  }
}

/**
 * Server Action — Liste les dernières actions Élio Hub de l'opérateur
 * (100 max, plus récentes en premier). Retourne { data, error } — jamais throw.
 */
export async function listElioHubActions(): Promise<ActionResponse<ElioHubAction[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data: operator } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!(operator as { id: string } | null)?.id) {
      return errorResponse("Accès réservé à l'opérateur", 'FORBIDDEN')
    }

    const { data, error } = await supabase
      .from('elio_hub_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT)

    if (error) {
      return errorResponse('Erreur lors du chargement des actions Élio', 'DB_ERROR', error)
    }

    return successResponse(((data ?? []) as Record<string, unknown>[]).map(rowToHubAction))
  } catch (err) {
    console.error('[ELIO:HUB_ACTIONS_HISTORY] Unexpected error:', err)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', {
      message: err instanceof Error ? err.message : String(err),
    })
  }
}
