'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import type { ActionError } from '@monprojetpro/types'

// ============================================================
// Shared auth helper — returns supabase client + userId for reuse
// Extracted to avoid duplication across server actions
// ============================================================

export type AssertOperatorResult = {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> | null
  userId: string | null
  error: ActionError | null
}

export async function assertOperator(): Promise<AssertOperatorResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { supabase: null, userId: null, error: { message: 'Non authentifié', code: 'UNAUTHORIZED' } }
  }

  const { data: isOperator } = await supabase.rpc('is_operator')
  if (!isOperator) {
    return { supabase: null, userId: null, error: { message: 'Accès réservé aux opérateurs', code: 'FORBIDDEN' } }
  }

  return { supabase, userId: user.id, error: null }
}
