'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'

export async function revokeGmail(): Promise<ActionResponse<void>> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Non authentifié', 'AUTH_ERROR')

  const { error } = await supabase
    .from('gmail_integrations')
    .delete()
    .eq('operator_id', user.id)

  if (error) return errorResponse('Impossible de déconnecter Gmail', 'DB_ERROR', error)
  return successResponse(undefined)
}
