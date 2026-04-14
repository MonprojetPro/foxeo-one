'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import type { ActionResponse, ActionError } from '@monprojetpro/types'

// ============================================================
// triggerClientBillingSync — sync immédiat pour le client connecté
// Utilisé depuis la vue "Mes factures" du dashboard One
// ============================================================

export async function triggerClientBillingSync(): Promise<ActionResponse<{ synced: number }>> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { data: null, error: { message: 'Non authentifié', code: 'UNAUTHORIZED' } }
  }

  // Trouver le client_id depuis auth_user_id
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (clientError || !client) {
    return {
      data: null,
      error: {
        message: 'Client introuvable',
        code: 'CLIENT_NOT_FOUND',
        details: clientError,
      } satisfies ActionError,
    }
  }

  const { data, error: invokeError } = await supabase.functions.invoke('billing-sync', {
    body: { clientId: client.id },
  })

  if (invokeError) {
    return {
      data: null,
      error: {
        message: 'Erreur lors de la synchronisation',
        code: 'SYNC_INVOKE_ERROR',
        details: invokeError,
      } satisfies ActionError,
    }
  }

  const synced = (data as { synced?: number })?.synced ?? 0
  return { data: { synced }, error: null }
}
