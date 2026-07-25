'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { z } from 'zod'

const EndImpersonationInput = z.object({
  sessionId: z.string().uuid(),
})

export interface EndImpersonationResult {
  ended: boolean
}

export async function endImpersonation(
  input: z.infer<typeof EndImpersonationInput>
): Promise<ActionResponse<EndImpersonationResult>> {
  try {
    const parsed = EndImpersonationInput.safeParse(input)
    if (!parsed.success) {
      return errorResponse('ID de session invalide', 'VALIDATION_ERROR')
    }

    const supabase = await createServerSupabaseClient()

    // 1. Verify authenticated user is operator
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Accès réservé aux opérateurs', 'FORBIDDEN')
    }

    // 2. Fetch the session (include started_at for action count query)
    const { data: session, error: sessionError } = await supabase
      .from('impersonation_sessions')
      .select('id, operator_id, client_id, status, started_at')
      .eq('id', parsed.data.sessionId)
      .single()

    if (sessionError || !session) {
      return errorResponse('Session introuvable', 'NOT_FOUND')
    }

    if (session.status !== 'active') {
      return successResponse({ ended: true }) // Already ended
    }

    // 3. Clôture + décompte des actions.
    // Correctif 2026-07-25 — l'ancien comptage filtrait sur l'opérateur et la date de
    // début, donc n'attrapait que les événements de cycle de vie (« session démarrée »)
    // → actions_count valait toujours 1. Le décompte réel est fait par
    // fn_close_impersonation_session, partagée avec la fermeture depuis la bannière,
    // pour que les deux chemins produisent exactement le même résultat.
    const { data: closed, error: closeError } = await supabase.rpc(
      'fn_close_impersonation_session',
      { p_session_id: session.id, p_status: 'ended' }
    )

    if (closeError) {
      console.error('[IMPERSONATION:END] RPC error:', closeError)
      return errorResponse('Erreur lors de la fermeture de la session', 'DATABASE_ERROR')
    }

    const closedRow = Array.isArray(closed) ? closed[0] : closed
    const actionsCount = (closedRow as { actions_count?: number } | null)?.actions_count ?? 0

    // 4. Activity log
    await supabase.from('activity_logs').insert({
      actor_type: 'operator_impersonation',
      actor_id: session.operator_id,
      action: 'impersonation_ended',
      entity_type: 'client',
      entity_id: session.client_id,
      metadata: {
        session_id: session.id,
        actions_count: actionsCount,
      },
    })

    return successResponse({ ended: true })
  } catch (error) {
    console.error('[IMPERSONATION:END] Unexpected error:', error)
    return errorResponse(
      'Une erreur inattendue est survenue',
      'INTERNAL_ERROR',
      { message: error instanceof Error ? error.message : String(error) }
    )
  }
}
