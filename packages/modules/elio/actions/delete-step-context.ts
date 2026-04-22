'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

const InputSchema = z.object({
  contextId: z.string().uuid('contextId invalide'),
})

/**
 * Story 14.6 — Task 3.3
 * Server Action — Supprime un contexte injecté par l'opérateur.
 * Seul un opérateur peut supprimer (vérifié par RLS).
 */
export async function deleteStepContext(
  contextId: string
): Promise<ActionResponse<{ deleted: boolean }>> {
  const parsed = InputSchema.safeParse({ contextId })
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? 'Données invalides', 'VALIDATION_ERROR')
  }

  try {
    const supabase = await createServerSupabaseClient()

    // 1. Récupérer le file_path avant suppression pour nettoyer Storage si nécessaire
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ctx } = await (supabase as any)
      .from('client_step_contexts')
      .select('file_path')
      .eq('id', parsed.data.contextId)
      .maybeSingle() as { data: { file_path: string | null } | null }

    // 2. Supprimer la ligne en base
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('client_step_contexts')
      .delete()
      .eq('id', parsed.data.contextId) as { error: unknown }

    if (error) {
      console.error('[ELIO:DELETE_STEP_CONTEXT] DB error:', error)
      return errorResponse('Erreur lors de la suppression du contexte', 'DB_ERROR', {
        message: String(error),
      })
    }

    // 3. Nettoyer le fichier Storage associé si applicable (évite les orphelins)
    if (ctx?.file_path) {
      const { error: storageError } = await supabase.storage
        .from('step-contexts')
        .remove([ctx.file_path])
      if (storageError) {
        console.error('[ELIO:DELETE_STEP_CONTEXT] Storage cleanup error (non-bloquant):', storageError)
      }
    }

    return successResponse({ deleted: true })
  } catch (error) {
    console.error('[ELIO:DELETE_STEP_CONTEXT] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
