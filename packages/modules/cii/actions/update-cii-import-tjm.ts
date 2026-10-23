'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import { UpdateCiiImportTjmInput as UpdateCiiImportTjmSchema } from '../types/cii.types'
import type { CiiImportDB, CiiImport } from '../types/cii.types'

// Décision du 23-10 : le TJM est fixé à 300€ par défaut mais doit toujours
// pouvoir être corrigé par MiKL — un champ éditable, jamais une valeur en dur.
export async function updateCiiImportTjm(input: unknown): Promise<ActionResponse<CiiImport>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    const parsed = UpdateCiiImportTjmSchema.safeParse(input)
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? 'Données invalides',
        'VALIDATION_ERROR',
        parsed.error.issues
      )
    }

    const { data, error } = await supabase
      .from('cii_imports')
      .update({ tjm_euros: parsed.data.tjmEuros, updated_at: new Date().toISOString() })
      .eq('id', parsed.data.importId)
      .select()
      .single()

    if (error || !data) {
      console.error('[CII:UPDATE_TJM] Error:', error)
      return errorResponse('Impossible de mettre à jour le TJM', 'UPDATE_FAILED', error)
    }

    return successResponse(toCamelCase(data as CiiImportDB) as unknown as CiiImport)
  } catch (error) {
    console.error('[CII:UPDATE_TJM] Unexpected error:', error)
    return errorResponse('Erreur interne', 'INTERNAL_ERROR', error)
  }
}
