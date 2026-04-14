'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import {
  GetDocumentsInput,
  type DocumentDB,
  type DocumentFilters,
} from '../types/document.types'
import type { DocumentFolderDB } from '../types/folder.types'
import { toDocument } from '../utils/to-document'
import { toDocumentFolder } from '../utils/to-document-folder'
import { generateDocumentsCsv } from '../utils/csv-generator'
import { applyDocumentFilters } from '../utils/apply-document-filters'

export async function exportDocumentsCSV(
  clientId: string,
  filters?: DocumentFilters
): Promise<ActionResponse<{ csvContent: string; fileName: string; count: number }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = GetDocumentsInput.safeParse({ clientId })
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { data: docData, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (docError) {
      console.error('[DOCUMENTS:EXPORT_CSV] DB error:', docError)
      return errorResponse('Erreur lors du chargement des documents', 'DB_ERROR', docError)
    }

    const documents = applyDocumentFilters(
      (docData as DocumentDB[]).map(toDocument),
      filters
    )

    const { data: folderData } = await supabase
      .from('document_folders')
      .select('*')
      .eq('client_id', clientId)

    const folders = folderData ? (folderData as DocumentFolderDB[]).map(toDocumentFolder) : []

    const csvContent = generateDocumentsCsv(documents, folders)
    const date = new Date().toISOString().split('T')[0]
    const fileName = `documents-${clientId.slice(0, 8)}-${date}.csv`

    console.info(`[DOCUMENTS:EXPORT_CSV] ${documents.length} documents exportés`)
    return successResponse({ csvContent, fileName, count: documents.length })
  } catch (error) {
    console.error('[DOCUMENTS:EXPORT_CSV] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
