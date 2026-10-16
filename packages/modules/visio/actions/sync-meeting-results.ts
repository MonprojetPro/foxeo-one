'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { z } from 'zod'
import { syncMeetingResultsCore, type MeetingSyncOutcome } from '../lib/meeting-results-sync'

const SyncMeetingResultsInput = z.object({
  meetingId: z.string().uuid('meetingId invalide'),
})

/**
 * Récupération manuelle des résultats d'une visio — bouton « Récupérer
 * maintenant » (T-050).
 *
 * La logique vit dans `lib/meeting-results-sync` : le cron de rattrapage
 * l'exécute avec une identité de service, sans passer par cette action.
 * Ici, le client Supabase porte la session de MiKL, donc la RLS s'applique :
 * un opérateur ne peut relancer que les visios qu'il voit.
 */
export async function syncMeetingResults(input: {
  meetingId: string
}): Promise<ActionResponse<MeetingSyncOutcome>> {
  try {
    const parsed = SyncMeetingResultsInput.safeParse(input)
    if (!parsed.success) {
      return errorResponse('meetingId invalide', 'VALIDATION_ERROR', parsed.error.issues)
    }

    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const result = await syncMeetingResultsCore(supabase, parsed.data.meetingId)

    // Chaque motif a son message : « rien reçu » n'est pas « jeton mort », et
    // laisser croire le contraire envoie MiKL déboguer au mauvais endroit.
    switch (result.reason) {
      case 'not_found':
        return errorResponse('Visio introuvable', 'NOT_FOUND')
      case 'no_space':
        return errorResponse(
          "Cette visio n'a pas de salle Google Meet — il n'y a rien à récupérer.",
          'NO_SPACE'
        )
      case 'config_missing':
        return errorResponse('Configuration Google Meet manquante', 'CONFIG_ERROR')
      case 'auth_error':
        return errorResponse('Connexion Google expirée ou révoquée — à reconnecter.', 'AUTH_ERROR')
      case 'api_error':
        return errorResponse('Google a refusé la demande. Réessaie dans quelques minutes.', 'API_ERROR')
      case 'db_error':
        return errorResponse("Erreur d'enregistrement du résultat", 'DB_ERROR')
      default:
        return successResponse(result)
    }
  } catch (error) {
    console.error('[VISIO:SYNC_RESULTS] Erreur inattendue:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
