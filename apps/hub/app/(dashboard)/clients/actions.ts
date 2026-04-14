'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { errorResponse, successResponse } from '@monprojetpro/types'
import type { ActionResponse } from '@monprojetpro/types'

/**
 * Force disconnect all sessions for a specific client.
 * Admin only — used by MiKL to force-logout a client from all devices.
 * UI will be added in Epic 2 (CRM module).
 */
export async function forceDisconnectClientAction(
  clientId: string
): Promise<ActionResponse<{ revokedCount: number }>> {
  if (!clientId) {
    return errorResponse('ID client requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  // Verify current user is admin
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return errorResponse('Non authentifie', 'UNAUTHORIZED')
  }

  // Get client's auth_user_id (RLS: clients_select_operator allows operator to see their clients)
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('auth_user_id')
    .eq('id', clientId)
    .single() as { data: { auth_user_id: string | null } | null; error: unknown }

  if (clientError || !client) {
    return errorResponse('Client non trouve', 'NOT_FOUND')
  }

  if (!client.auth_user_id) {
    return errorResponse('Le client n\'a pas de compte utilisateur lie', 'NOT_FOUND')
  }

  // Revoke all sessions via SECURITY DEFINER function (admin guard inside)
  const { data, error } = await supabase.rpc('fn_admin_revoke_all_sessions', {
    p_user_id: client.auth_user_id,
  } as never)

  if (error) {
    return errorResponse('Erreur lors de la deconnexion forcee', 'REVOKE_ERROR', error)
  }

  const result = data as { success: boolean; revokedCount?: number; error?: string } | null
  if (!result?.success) {
    return errorResponse(result?.error ?? 'Echec de la deconnexion forcee', 'REVOKE_ERROR')
  }

  // TODO (Epic 3): Envoyer notification au client via Supabase Realtime

  return successResponse({ revokedCount: result.revokedCount ?? 0 })
}
