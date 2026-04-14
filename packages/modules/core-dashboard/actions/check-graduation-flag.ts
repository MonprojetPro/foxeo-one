'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

export interface GraduationFlagResult {
  shouldShow: boolean
}

/**
 * Server Action — Vérifie si l'écran de graduation doit être affiché.
 * Interroge la table user_preferences pour le flag show_graduation_screen.
 * Retourne { shouldShow: true } si le flag est true, false sinon.
 * Retourne toujours { data, error } — jamais throw.
 */
export async function checkGraduationScreenFlag(
  clientId: string
): Promise<ActionResponse<GraduationFlagResult>> {
  if (!clientId) {
    return errorResponse('clientId requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('user_preferences')
    .select('show_graduation_screen')
    .eq('client_id', clientId)
    .maybeSingle()

  if (error) {
    console.error('[CORE-DASHBOARD:GRADUATION-FLAG] DB error:', error)
    return errorResponse('Erreur lors de la vérification du flag', 'DB_ERROR', error)
  }

  // Si aucune préférence trouvée, le flag est false par défaut
  const shouldShow = data?.show_graduation_screen ?? false

  return successResponse({ shouldShow })
}
