'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { DeleteDocumentInput } from '../types/document.types'

export async function deleteDocument(
  input: DeleteDocumentInput
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

    const parsed = DeleteDocumentInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { documentId } = parsed.data

    // SOFT DELETE: Set deleted_at timestamp instead of hard delete
    // Storage file is kept to allow undo restoration
    // Note: A cleanup job could hard-delete documents after X days if needed
    const { error: deleteError } = await supabase
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', documentId)

    if (deleteError) {
      console.error('[DOCUMENTS:DELETE] DB delete error:', deleteError)
      return errorResponse('Échec de la suppression du document', 'DB_ERROR', deleteError)
    }

    return successResponse({ id: documentId })
  } catch (error) {
    console.error('[DOCUMENTS:DELETE] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
