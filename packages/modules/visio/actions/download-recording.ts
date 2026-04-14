'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { DownloadRecordingInput } from '../types/recording.types'

export async function downloadRecording(
  input: { recordingId: string }
): Promise<ActionResponse<{ signedUrl: string }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = DownloadRecordingInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    // Fetch recording (RLS will filter access)
    const { data: recording, error: findError } = await supabase
      .from('meeting_recordings')
      .select('recording_url')
      .eq('id', parsed.data.recordingId)
      .single()

    if (findError || !recording) {
      return errorResponse('Recording non trouvé', 'NOT_FOUND')
    }

    // Generate signed URL (valid 1 hour)
    const { data: signedData, error: signedError } = await supabase.storage
      .from('recordings')
      .createSignedUrl(recording.recording_url, 3600)

    if (signedError || !signedData) {
      console.error('[VISIO:DOWNLOAD_RECORDING] Signed URL error:', signedError)
      return errorResponse('Impossible de générer le lien de téléchargement', 'STORAGE_ERROR', signedError)
    }

    return successResponse({ signedUrl: signedData.signedUrl })
  } catch (error) {
    console.error('[VISIO:DOWNLOAD_RECORDING] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
