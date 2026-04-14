'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { DownloadTranscriptInput } from '../types/recording.types'

export async function downloadTranscript(
  input: { recordingId: string }
): Promise<ActionResponse<{ signedUrl: string }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = DownloadTranscriptInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    // Fetch recording (RLS will filter access)
    const { data: recording, error: findError } = await supabase
      .from('meeting_recordings')
      .select('transcript_url, transcription_status')
      .eq('id', parsed.data.recordingId)
      .single()

    if (findError || !recording) {
      return errorResponse('Recording non trouvé', 'NOT_FOUND')
    }

    if (recording.transcription_status !== 'completed' || !recording.transcript_url) {
      return errorResponse('Transcription non disponible', 'NOT_READY')
    }

    // Generate signed URL (valid 1 hour)
    const { data: signedData, error: signedError } = await supabase.storage
      .from('transcripts')
      .createSignedUrl(recording.transcript_url, 3600)

    if (signedError || !signedData) {
      console.error('[VISIO:DOWNLOAD_TRANSCRIPT] Signed URL error:', signedError)
      return errorResponse('Impossible de générer le lien de téléchargement', 'STORAGE_ERROR', signedError)
    }

    return successResponse({ signedUrl: signedData.signedUrl })
  } catch (error) {
    console.error('[VISIO:DOWNLOAD_TRANSCRIPT] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
