'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { RenameFolderInput, type DocumentFolder, type DocumentFolderDB } from '../types/folder.types'
import { toDocumentFolder } from '../utils/to-document-folder'

export async function renameFolder(
  input: RenameFolderInput
): Promise<ActionResponse<DocumentFolder>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = RenameFolderInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { folderId, name } = parsed.data

    const { data, error } = await supabase
      .from('document_folders')
      .update({ name })
      .eq('id', folderId)
      .select()
      .single()

    if (error) {
      console.error('[DOCUMENTS:RENAME_FOLDER] DB error:', error)
      return errorResponse('Erreur lors du renommage du dossier', 'DB_ERROR', error)
    }

    if (!data) {
      return errorResponse('Dossier introuvable', 'NOT_FOUND')
    }

    return successResponse(toDocumentFolder(data as DocumentFolderDB))
  } catch (error) {
    console.error('[DOCUMENTS:RENAME_FOLDER] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
