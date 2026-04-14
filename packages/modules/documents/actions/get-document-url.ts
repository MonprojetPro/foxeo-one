'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { GetDocumentUrlInput, type Document, type DocumentDB } from '../types/document.types'
import { toDocument } from '../utils/to-document'

export async function getDocumentUrl(
  input: GetDocumentUrlInput
): Promise<ActionResponse<{ url: string; document: Document }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = GetDocumentUrlInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { documentId } = parsed.data

    // RLS filtre automatiquement les documents non autorisés
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      console.error('[DOCUMENTS:VIEW] Document not found:', docError)
      return errorResponse('Document introuvable', 'NOT_FOUND')
    }

    const typedDoc = doc as DocumentDB

    const download = parsed.data.download ?? false

    const { data: urlData, error: urlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(typedDoc.file_path, 3600, download ? { download: typedDoc.name } : undefined)

    if (urlError || !urlData) {
      console.error('[DOCUMENTS:VIEW] Signed URL error:', urlError)
      return errorResponse('Erreur lors de la génération de l\'URL', 'STORAGE_ERROR', { message: urlError?.message })
    }

    return successResponse({
      url: urlData.signedUrl,
      document: toDocument(typedDoc),
    })
  } catch (error) {
    console.error('[DOCUMENTS:VIEW] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
