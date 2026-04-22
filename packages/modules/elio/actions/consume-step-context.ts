'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

const InputSchema = z.object({
  contextId: z.string().uuid('contextId invalide'),
})

/**
 * Server Action — Marque un contexte d'étape comme consommé (consumed_at = NOW()).
 * Idempotent : ne met à jour que si consumed_at est encore NULL.
 * Appelé par StepElioChat après injection du message d'annonce MiKL.
 */
export async function consumeStepContext(
  contextId: string
): Promise<ActionResponse<{ consumed: boolean }>> {
  try {
    const parsed = InputSchema.safeParse({ contextId })
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR')
    }

    const supabase = await createServerSupabaseClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('client_step_contexts')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', parsed.data.contextId)
      .is('consumed_at', null)

    if (error) {
      console.error('[ELIO:CONSUME_STEP_CONTEXT] Error:', error)
      return errorResponse('Erreur lors de la consommation du contexte', 'DB_ERROR', {
        message: String(error),
      })
    }

    return successResponse({ consumed: true })
  } catch (error) {
    console.error('[ELIO:CONSUME_STEP_CONTEXT] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
