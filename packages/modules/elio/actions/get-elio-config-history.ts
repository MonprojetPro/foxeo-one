'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import type { ElioConfigHistoryEntry } from '../types/elio.types'

/**
 * Server Action — Récupère l'historique des configurations Élio d'un client.
 * Accessible aux opérateurs uniquement (RLS).
 */
export async function getElioConfigHistory(
  clientId: string
): Promise<ActionResponse<ElioConfigHistoryEntry[]>> {
  if (!clientId) {
    return errorResponse('clientId requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('elio_config_history')
    .select('*')
    .eq('client_id', clientId)
    .order('changed_at', { ascending: false })

  if (error) {
    console.error('[ELIO:GET_CONFIG_HISTORY] Error:', error)
    return errorResponse('Erreur chargement historique', 'DB_ERROR', error)
  }

  const entries = (data ?? []).map(
    (row) => toCamelCase(row) as unknown as ElioConfigHistoryEntry
  )

  return successResponse(entries)
}
