'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { MoveDocumentInput } from '../types/folder.types'
import { type Document, type DocumentDB } from '../types/document.types'
import { toDocument } from '../utils/to-document'

export async function moveDocument(
  input: MoveDocumentInput
): Promise<ActionResponse<Document>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = MoveDocumentInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { documentId, folderId } = parsed.data

    // Verify document exists
    const { data: existing, error: fetchError } = await supabase
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .single()

    if (fetchError || !existing) {
      return errorResponse('Document introuvable', 'NOT_FOUND')
    }

    // If folderId is provided, verify folder exists
    if (folderId !== null) {
      const { data: folder, error: folderError } = await supabase
        .from('document_folders')
        .select('id')
        .eq('id', folderId)
        .single()

      if (folderError || !folder) {
        return errorResponse('Dossier introuvable', 'NOT_FOUND')
      }
    }

    const { data, error } = await supabase
      .from('documents')
      .update({ folder_id: folderId })
      .eq('id', documentId)
      .select()
      .single()

    if (error) {
      console.error('[DOCUMENTS:MOVE_DOCUMENT] DB error:', error)
      return errorResponse('Erreur lors du déplacement du document', 'DB_ERROR', error)
    }

    return successResponse(toDocument(data as DocumentDB))
  } catch (error) {
    console.error('[DOCUMENTS:MOVE_DOCUMENT] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
