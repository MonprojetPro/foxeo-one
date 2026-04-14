'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import { type ElioConfig, type ElioConfigDB, toElioConfig } from '../types/elio-config.types'

/**
 * Server Action — Restaure la configuration Élio d'un client depuis l'historique.
 * Accessible aux opérateurs uniquement (RLS sur elio_configs).
 * Enregistre automatiquement la restauration dans l'historique via le trigger.
 * Retourne toujours { data, error } — jamais throw.
 */
export async function restoreElioConfig(
  clientId: string,
  historyEntryId: string
): Promise<ActionResponse<ElioConfig>> {
  if (!clientId || !historyEntryId) {
    return errorResponse('clientId et historyEntryId requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  // Récupérer l'entrée d'historique
  const { data: historyEntry, error: historyError } = await supabase
    .from('elio_config_history')
    .select('old_value, client_id')
    .eq('id', historyEntryId)
    .eq('client_id', clientId)
    .single()

  if (historyError || !historyEntry) {
    return errorResponse('Entrée historique non trouvée', 'NOT_FOUND', historyError)
  }

  const oldConfig = historyEntry.old_value as Record<string, unknown> | null
  if (!oldConfig) {
    return errorResponse('Aucune configuration précédente disponible', 'VALIDATION_ERROR')
  }

  // Restaurer la config (le trigger enregistrera le changement dans l'historique)
  // NB: champs alignés avec le schema elio_configs (migration 00043).
  // Si le schema évolue, mettre à jour ce destructuring ET le trigger 00047.
  const { model, temperature, max_tokens, custom_instructions, enabled_features } = oldConfig as Record<string, unknown>
  const { data: restored, error: updateError } = await supabase
    .from('elio_configs')
    .update({
      model: model as string,
      temperature: temperature as number,
      max_tokens: max_tokens as number,
      custom_instructions: (custom_instructions as string | null) ?? null,
      enabled_features: (enabled_features as Record<string, boolean>) ?? {},
    })
    .eq('client_id', clientId)
    .select()
    .single()

  if (updateError || !restored) {
    console.error('[ELIO:RESTORE_CONFIG] Error:', updateError)
    return errorResponse('Erreur lors de la restauration', 'DB_ERROR', updateError)
  }

  console.log('[ELIO:RESTORE_CONFIG] Config restaurée pour client:', clientId)

  return successResponse(toElioConfig(restored as ElioConfigDB))
}
