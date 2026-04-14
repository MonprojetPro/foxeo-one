'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

/**
 * Server Action — Remet à false le flag show_graduation_screen.
 * Appelée après fermeture de l'écran de graduation (Story 5.6).
 * L'écran est affiché une seule fois.
 *
 * Utilise UPSERT pour créer la ligne si elle n'existe pas encore.
 * Retourne toujours { data, error } — jamais throw.
 */
export async function dismissGraduationScreen(
  clientId: string
): Promise<ActionResponse<boolean>> {
  if (!clientId) {
    return errorResponse('clientId requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        client_id: clientId,
        show_graduation_screen: false,
      },
      { onConflict: 'client_id' }
    )

  if (error) {
    console.error('[CORE-DASHBOARD:DISMISS-GRADUATION] DB error:', error)
    return errorResponse('Erreur lors de la mise à jour du flag', 'DB_ERROR', error)
  }

  return successResponse(true)
}
