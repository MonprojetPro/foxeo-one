'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { type ElioConfig, DEFAULT_ELIO_CONFIG } from '../types/elio-config.types'

export async function resetElioConfig(): Promise<ActionResponse<ElioConfig>> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return errorResponse('Non authentifié', 'UNAUTHORIZED')
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (clientError || !client) {
    return errorResponse('Client non trouvé', 'NOT_FOUND', clientError)
  }

  const { error: deleteError } = await supabase
    .from('elio_configs')
    .delete()
    .eq('client_id', client.id)

  if (deleteError) {
    console.error('[ELIO:RESET_CONFIG] Error:', deleteError)
    return errorResponse('Erreur réinitialisation config', 'DB_ERROR', deleteError)
  }

  console.log('[ELIO:RESET_CONFIG] Config réinitialisée pour client:', client.id)

  return successResponse(DEFAULT_ELIO_CONFIG)
}
