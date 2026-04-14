'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { z } from 'zod'

const RestoreDocumentInput = z.object({
  documentId: z.string().uuid(),
})

export type RestoreDocumentInput = z.infer<typeof RestoreDocumentInput>

/**
 * Restore a soft-deleted document (undo delete action)
 */
export async function restoreDocument(
  input: RestoreDocumentInput
): Promise<ActionResponse<{ id: string }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = RestoreDocumentInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { documentId } = parsed.data

    // Restore document by setting deleted_at to null
    // Note: We query without the deleted_at filter to allow restoring deleted docs
    const { error } = await supabase
      .from('documents')
      .update({ deleted_at: null })
      .eq('id', documentId)
      .not('deleted_at', 'is', null) // Only restore if actually deleted

    if (error) {
      console.error('[DOCUMENTS:RESTORE] DB error:', error)
      return errorResponse('Erreur lors de la restauration', 'DB_ERROR', error)
    }

    console.info(`[DOCUMENTS:RESTORE] Document restored: ${documentId}`)
    return successResponse({ id: documentId })
  } catch (error) {
    console.error('[DOCUMENTS:RESTORE] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
