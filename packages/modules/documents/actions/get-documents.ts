'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { GetDocumentsInput, type Document, type DocumentDB } from '../types/document.types'
import { toDocument } from '../utils/to-document'

export async function getDocuments(
  input: GetDocumentsInput
): Promise<ActionResponse<Document[]>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = GetDocumentsInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { clientId } = parsed.data

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[DOCUMENTS:GET] DB error:', error)
      return errorResponse('Erreur lors du chargement des documents', 'DB_ERROR', error)
    }

    return successResponse((data as DocumentDB[]).map(toDocument))
  } catch (error) {
    console.error('[DOCUMENTS:GET] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
