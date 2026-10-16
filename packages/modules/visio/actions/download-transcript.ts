'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { DownloadTranscriptInput } from '../types/recording.types'

/**
 * Lien de téléchargement de la transcription — T-050.
 *
 * 🔴 CE QUE CETTE ACTION FAISAIT AVANT, ET POURQUOI ELLE N'A JAMAIS MARCHÉ :
 * elle appelait `storage.from('transcripts').createSignedUrl(transcript_url)`.
 * Or `transcript_url` est une **URL Google Docs**, pas un chemin de bucket — et
 * le bucket `transcripts` est resté VIDE depuis sa création (vérifié dans
 * `storage.objects`). Elle signait donc un chemin inexistant dans un bucket où
 * rien n'a jamais été écrit : échec garanti, à chaque appel, depuis l'origine.
 *
 * Ce qu'elle fait maintenant, dans cet ordre :
 *   ① le PDF archivé dans le dossier du client, s'il existe — c'est le
 *      document que MiKL a sous la main, et il reste lisible même si Google
 *      supprime le Doc d'origine ;
 *   ② sinon l'URL Google Docs — lisible tant que le compte Google l'héberge.
 *
 * On ne renvoie jamais « indisponible » quand l'une des deux voies existe.
 */
export async function downloadTranscript(input: {
  recordingId: string
}): Promise<ActionResponse<{ signedUrl: string; source: 'archive' | 'google' }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = DownloadTranscriptInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    // La RLS filtre : un opérateur ne voit que ses visios, un client les siennes.
    const { data: recording, error: findError } = await supabase
      .from('meeting_recordings')
      .select('transcript_url, transcription_status, transcript_document_id')
      .eq('id', parsed.data.recordingId)
      .maybeSingle()

    if (findError || !recording) {
      return errorResponse('Enregistrement introuvable', 'NOT_FOUND')
    }

    // ① Le document archivé dans le dossier du client.
    if (recording.transcript_document_id) {
      const { data: document } = await supabase
        .from('documents')
        .select('file_path')
        .eq('id', recording.transcript_document_id)
        .is('deleted_at', null)
        .maybeSingle()

      if (document?.file_path) {
        const { data: signed, error: signedError } = await supabase.storage
          .from('documents')
          .createSignedUrl(document.file_path, 3600)

        if (signed?.signedUrl) {
          return successResponse({ signedUrl: signed.signedUrl, source: 'archive' as const })
        }
        // Le document existe en base mais plus dans le stockage : on le DIT
        // dans les logs, et on se rabat sur Google plutôt que d'échouer.
        console.error(
          '[VISIO:DOWNLOAD_TRANSCRIPT] Document archivé introuvable dans le stockage:',
          signedError?.message
        )
      }
    }

    // ② Le document Google d'origine.
    if (recording.transcript_url) {
      return successResponse({ signedUrl: recording.transcript_url, source: 'google' as const })
    }

    return errorResponse(
      recording.transcription_status === 'completed'
        ? "La transcription existe mais aucun lien n'est disponible."
        : "La transcription n'est pas encore prête.",
      'NOT_READY'
    )
  } catch (error) {
    console.error('[VISIO:DOWNLOAD_TRANSCRIPT] Erreur inattendue:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
