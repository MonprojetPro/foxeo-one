'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { DownloadRecordingInput } from '../types/recording.types'

/**
 * Lien vers l'enregistrement vidéo de la visio — T-050.
 *
 * 🔴 MÊME DÉFAUT D'ORIGINE QUE `downloadTranscript` : l'action signait
 * `recording_url` comme un chemin du bucket `recordings`, alors que c'est une
 * **URL Google Drive**. Le bucket est vide depuis sa création : l'action n'a
 * jamais rendu un lien valide.
 *
 * 🔑 ET ON NE RAPATRIE PAS LA VIDÉO (décision MiKL du 16-10) : un
 * enregistrement de visio pèse des centaines de Mo, Google le conserve déjà,
 * et le dupliquer coûterait du stockage pour un fichier que personne ne
 * relit. L'action rend donc le lien Drive, et le dit.
 */
export async function downloadRecording(input: {
  recordingId: string
}): Promise<ActionResponse<{ signedUrl: string; source: 'google' }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = DownloadRecordingInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { data: recording, error: findError } = await supabase
      .from('meeting_recordings')
      .select('recording_url')
      .eq('id', parsed.data.recordingId)
      .maybeSingle()

    if (findError || !recording) {
      return errorResponse('Enregistrement introuvable', 'NOT_FOUND')
    }

    // La synchro insère une chaîne vide quand Google n'a pas (encore) produit
    // de vidéo. Une URL vide renverrait l'utilisateur sur une page blanche.
    if (!recording.recording_url || recording.recording_url.trim().length === 0) {
      return errorResponse(
        "Aucun enregistrement vidéo pour cette visio. Google n'en produit que si l'enregistrement a été lancé pendant l'appel.",
        'NOT_READY'
      )
    }

    return successResponse({ signedUrl: recording.recording_url, source: 'google' as const })
  } catch (error) {
    console.error('[VISIO:DOWNLOAD_RECORDING] Erreur inattendue:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
