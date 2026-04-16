'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

export async function endImpersonationClient(
  sessionId: string
): Promise<ActionResponse<{ ended: boolean }>> {
  try {
    if (!sessionId) {
      return errorResponse('ID de session manquant', 'VALIDATION_ERROR')
    }

    const supabase = await createServerSupabaseClient()

    // Update session status to ended
    const { error: updateError } = await supabase
      .from('impersonation_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('status', 'active')

    if (updateError) {
      console.error('[IMPERSONATION:END_CLIENT] Update error:', updateError)
      return errorResponse('Erreur lors de la fermeture', 'DATABASE_ERROR')
    }

    return successResponse({ ended: true })
  } catch (error) {
    console.error('[IMPERSONATION:END_CLIENT] Error:', error)
    return errorResponse(
      'Erreur inattendue',
      'INTERNAL_ERROR',
      { message: error instanceof Error ? error.message : String(error) }
    )
  }
}
