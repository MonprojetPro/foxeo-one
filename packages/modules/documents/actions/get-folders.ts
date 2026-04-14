'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { GetFoldersInput, type DocumentFolder, type DocumentFolderDB } from '../types/folder.types'
import { toDocumentFolder } from '../utils/to-document-folder'

export async function getFolders(
  input: GetFoldersInput
): Promise<ActionResponse<DocumentFolder[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = GetFoldersInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { clientId } = parsed.data

    const { data, error } = await supabase
      .from('document_folders')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[DOCUMENTS:GET_FOLDERS] DB error:', error)
      return errorResponse('Erreur lors du chargement des dossiers', 'DB_ERROR', error)
    }

    return successResponse((data as DocumentFolderDB[]).map(toDocumentFolder))
  } catch (error) {
    console.error('[DOCUMENTS:GET_FOLDERS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
