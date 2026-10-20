'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

// ============================================================
// deleteClientProject — T-063
//
// Ne supprime pas le dossier local ni son contenu : seule la ligne qui le
// rattache au client disparait. `documents.client_project_id` repasse a NULL
// (ON DELETE SET NULL) — les documents deja ranges ne sont pas perdus.
// ============================================================

export async function deleteClientProject(projectId: string): Promise<ActionResponse<null>> {
  try {
    if (!projectId) return errorResponse('Projet requis', 'VALIDATION_ERROR')

    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    const { error } = await supabase.from('client_projects').delete().eq('id', projectId)

    if (error) {
      console.error('[CRM:DELETE_PROJECT] Delete error:', error)
      return errorResponse('Impossible de supprimer le projet', 'DELETE_FAILED', error)
    }

    return successResponse(null)
  } catch (error) {
    console.error('[CRM:DELETE_PROJECT] Unexpected error:', error)
    return errorResponse('Erreur interne', 'INTERNAL_ERROR', error)
  }
}
