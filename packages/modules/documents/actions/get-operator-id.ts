'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import type { ActionResponse } from '@monprojetpro/types'

export async function getOperatorId(): Promise<ActionResponse<string>> {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: null, error: { message: 'Non authentifié', code: 'UNAUTHORIZED' } }
  }

  const { data: operator } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!operator) {
    return { data: null, error: { message: 'Opérateur non trouvé', code: 'NOT_FOUND' } }
  }

  return { data: (operator as { id: string }).id, error: null }
}
