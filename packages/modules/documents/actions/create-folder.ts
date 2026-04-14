'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { CreateFolderInput, type DocumentFolder, type DocumentFolderDB } from '../types/folder.types'
import { toDocumentFolder } from '../utils/to-document-folder'

export async function createFolder(
  input: CreateFolderInput
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

    const parsed = CreateFolderInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { clientId, operatorId, name, parentId } = parsed.data

    const { data, error } = await supabase
      .from('document_folders')
      .insert({
        client_id: clientId,
        operator_id: operatorId,
        name,
        parent_id: parentId,
      })
      .select()
      .single()

    if (error) {
      console.error('[DOCUMENTS:CREATE_FOLDER] DB error:', error)
      return errorResponse('Erreur lors de la création du dossier', 'DB_ERROR', error)
    }

    return successResponse(toDocumentFolder(data as DocumentFolderDB))
  } catch (error) {
    console.error('[DOCUMENTS:CREATE_FOLDER] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
