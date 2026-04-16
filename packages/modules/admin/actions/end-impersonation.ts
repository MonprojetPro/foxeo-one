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

    // 3. Count actions during session
    const { count: actionsCount } = await supabase
      .from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('actor_type', 'operator_impersonation')
      .eq('actor_id', session.operator_id)
      .gte('created_at', session.started_at)

    // 4. End the session
    const { error: updateError } = await supabase
      .from('impersonation_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        actions_count: actionsCount ?? 0,
      })
      .eq('id', session.id)

    if (updateError) {
      console.error('[IMPERSONATION:END] Update error:', updateError)
      return errorResponse('Erreur lors de la fermeture de la session', 'DATABASE_ERROR')
    }

    // 5. Activity log
    await supabase.from('activity_logs').insert({
      actor_type: 'operator_impersonation',
      actor_id: session.operator_id,
      action: 'impersonation_ended',
      entity_type: 'client',
      entity_id: session.client_id,
      metadata: {
        session_id: session.id,
        actions_count: actionsCount ?? 0,
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
