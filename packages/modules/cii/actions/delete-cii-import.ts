'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

export async function deleteCiiImport(importId: string): Promise<ActionResponse<void>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    const { error } = await supabase.from('cii_imports').delete().eq('id', importId)

    if (error) {
      console.error('[CII:DELETE_IMPORT] Error:', error)
      return errorResponse('Impossible de supprimer cet import', 'DELETE_FAILED', error)
    }

    return successResponse(undefined)
  } catch (error) {
    console.error('[CII:DELETE_IMPORT] Unexpected error:', error)
    return errorResponse('Erreur interne', 'INTERNAL_ERROR', error)
  }
}
