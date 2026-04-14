'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import type { ActionResponse, ActionError } from '@monprojetpro/types'

// ============================================================
// triggerBillingSync — déclenche un sync immédiat Pennylane
// Réservé aux opérateurs (is_operator())
// Pattern assertOperator aligné sur billing-proxy.ts
// ============================================================

async function assertOperator(): Promise<{
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> | null
  error: ActionError | null
}> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { supabase: null, error: { message: 'Non authentifié', code: 'UNAUTHORIZED' } }
  }

  const { data: isOperator } = await supabase.rpc('is_operator')
  if (!isOperator) {
    return { supabase: null, error: { message: 'Accès réservé aux opérateurs', code: 'FORBIDDEN' } }
  }

  return { supabase, error: null }
}

export async function triggerBillingSync(
  clientId?: string
): Promise<ActionResponse<{ synced: number }>> {
  const { supabase, error: authError } = await assertOperator()
  if (authError || !supabase) return { data: null, error: authError }

  const body = clientId ? { clientId } : {}

  const { data, error: invokeError } = await supabase.functions.invoke('billing-sync', {
    body,
  })

  if (invokeError) {
    return {
      data: null,
      error: {
        message: 'Erreur lors du déclenchement de la synchronisation',
        code: 'SYNC_INVOKE_ERROR',
        details: invokeError,
      } satisfies ActionError,
    }
  }

  const synced = (data as { synced?: number })?.synced ?? 0
  return { data: { synced }, error: null }
}
