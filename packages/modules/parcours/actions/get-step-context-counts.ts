'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

const InputSchema = z.object({
  clientId: z.string().uuid('clientId invalide'),
})

/**
 * Story 14.6 — Task 4.2 (badge)
 * Server Action — Retourne le nombre de contextes non-consommés par client_parcours_agent_id
 * pour un client donné.
 *
 * Utilisé par ClientParcoursAgentsList pour afficher les badges "N contexte(s)".
 */
export async function getStepContextCounts(
  clientId: string
): Promise<ActionResponse<Record<string, number>>> {
  const parsed = InputSchema.safeParse({ clientId })
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? 'Données invalides', 'VALIDATION_ERROR')
  }

  try {
    const supabase = await createServerSupabaseClient()

    type Row = { client_parcours_agent_id: string }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('client_step_contexts')
      .select('client_parcours_agent_id')
      .eq('client_id', parsed.data.clientId)
      .not('client_parcours_agent_id', 'is', null)
      .is('consumed_at', null) as { data: Row[] | null; error: unknown }

    if (error) {
      console.error('[PARCOURS:GET_STEP_CONTEXT_COUNTS] DB error:', error)
      return errorResponse('Erreur lors de la récupération des compteurs', 'DB_ERROR', {
        message: String(error),
      })
    }

    // Agréger les counts côté JS
    const counts: Record<string, number> = {}
    for (const row of data ?? []) {
      if (row.client_parcours_agent_id) {
        counts[row.client_parcours_agent_id] = (counts[row.client_parcours_agent_id] ?? 0) + 1
      }
    }

    return successResponse(counts)
  } catch (error) {
    console.error('[PARCOURS:GET_STEP_CONTEXT_COUNTS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
