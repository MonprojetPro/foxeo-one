'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

// ============================================================
// assignDocumentProject — T-063
//
// Range (ou retire, projectId = null) un document existant dans un projet,
// pour qu'il apparaisse dans le bon dossier au moment de la copie locale.
// Ne deplace rien physiquement : seul le rattachement en base change.
// ============================================================

export async function assignDocumentProject(
  documentId: string,
  projectId: string | null
): Promise<ActionResponse<null>> {
  try {
    if (!documentId) return errorResponse('Document requis', 'VALIDATION_ERROR')

    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    const { error } = await supabase
      .from('documents')
      .update({ client_project_id: projectId })
      .eq('id', documentId)

    if (error) {
      console.error('[CRM:ASSIGN_DOCUMENT_PROJECT] Update error:', error)
      return errorResponse('Impossible de ranger ce document', 'UPDATE_FAILED', error)
    }

    return successResponse(null)
  } catch (error) {
    console.error('[CRM:ASSIGN_DOCUMENT_PROJECT] Unexpected error:', error)
    return errorResponse('Erreur interne', 'INTERNAL_ERROR', error)
  }
}
