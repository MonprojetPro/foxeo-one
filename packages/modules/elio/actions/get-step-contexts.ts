'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

const InputSchema = z.object({
  parcoursAgentId: z.string().uuid('parcoursAgentId invalide'),
})

export interface StepContext {
  id: string
  contentType: 'text' | 'file'
  contextMessage: string
  fileName: string | null
  filePath: string | null
  consumedAt: string | null
  createdAt: string
}

/**
 * Story 14.6 — Task 3.2
 * Server Action — Liste les contextes injectés pour une étape du parcours (tous, consommés ou non).
 * Triés du plus récent au plus ancien.
 */
export async function getStepContexts(
  parcoursAgentId: string
): Promise<ActionResponse<StepContext[]>> {
  const parsed = InputSchema.safeParse({ parcoursAgentId })
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? 'Données invalides', 'VALIDATION_ERROR')
  }

  try {
    const supabase = await createServerSupabaseClient()

    type Row = {
      id: string
      content_type: string
      context_message: string
      file_name: string | null
      file_path: string | null
      consumed_at: string | null
      created_at: string
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('client_step_contexts')
      .select('id, content_type, context_message, file_name, file_path, consumed_at, created_at')
      .eq('client_parcours_agent_id', parsed.data.parcoursAgentId)
      .order('created_at', { ascending: false }) as { data: Row[] | null; error: unknown }

    if (error) {
      console.error('[ELIO:GET_STEP_CONTEXTS] DB error:', error)
      return errorResponse('Erreur lors de la récupération des contextes', 'DB_ERROR', {
        message: String(error),
      })
    }

    const result: StepContext[] = (data ?? []).map((row: Row) => ({
      id: row.id,
      contentType: row.content_type as 'text' | 'file',
      contextMessage: row.context_message,
      fileName: row.file_name,
      filePath: row.file_path,
      consumedAt: row.consumed_at,
      createdAt: row.created_at,
    }))

    return successResponse(result)
  } catch (error) {
    console.error('[ELIO:GET_STEP_CONTEXTS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
