'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { DeleteFolderInput } from '../types/folder.types'

export async function deleteFolder(
  input: DeleteFolderInput
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = DeleteFolderInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { folderId } = parsed.data

    // Verify folder exists
    const { data: folder, error: fetchError } = await supabase
      .from('document_folders')
      .select('id')
      .eq('id', folderId)
      .single()

    if (fetchError || !folder) {
      return errorResponse('Dossier introuvable', 'NOT_FOUND')
    }

    // Verify folder is empty (no documents in it)
    const { count: docCount, error: docCountError } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('folder_id', folderId)

    if (docCountError) {
      console.error('[DOCUMENTS:DELETE_FOLDER] Doc count error:', docCountError)
      return errorResponse('Erreur lors de la vérification du dossier', 'DB_ERROR', docCountError)
    }

    if ((docCount ?? 0) > 0) {
      return errorResponse(
        'Impossible de supprimer un dossier contenant des documents',
        'FOLDER_NOT_EMPTY'
      )
    }

    // Verify folder has no child folders
    const { count: childCount, error: childCountError } = await supabase
      .from('document_folders')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', folderId)

    if (childCountError) {
      console.error('[DOCUMENTS:DELETE_FOLDER] Child count error:', childCountError)
      return errorResponse('Erreur lors de la vérification des sous-dossiers', 'DB_ERROR', childCountError)
    }

    if ((childCount ?? 0) > 0) {
      return errorResponse(
        'Impossible de supprimer un dossier contenant des sous-dossiers',
        'FOLDER_HAS_CHILDREN'
      )
    }

    const { error } = await supabase
      .from('document_folders')
      .delete()
      .eq('id', folderId)

    if (error) {
      console.error('[DOCUMENTS:DELETE_FOLDER] DB error:', error)
      return errorResponse('Erreur lors de la suppression du dossier', 'DB_ERROR', error)
    }

    return successResponse(undefined)
  } catch (error) {
    console.error('[DOCUMENTS:DELETE_FOLDER] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
