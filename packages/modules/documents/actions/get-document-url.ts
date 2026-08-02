'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { GetDocumentUrlInput, type Document, type DocumentDB } from '../types/document.types'
import { toDocument } from '../utils/to-document'

export async function getDocumentUrl(
  input: GetDocumentUrlInput
): Promise<ActionResponse<{ url: string; document: Document }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = GetDocumentUrlInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { documentId } = parsed.data

    // RLS filtre automatiquement les documents non autorisés
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !doc) {
      console.error('[DOCUMENTS:VIEW] Document not found:', docError)
      return errorResponse('Document introuvable', 'NOT_FOUND')
    }

    const typedDoc = doc as DocumentDB

    const download = parsed.data.download ?? false

    // Ne passer le 3ᵉ argument QUE pour un téléchargement : un `undefined` explicite
    // est transmis tel quel au client Storage au lieu d'être omis.
    const storage = supabase.storage.from('documents')
    const { data: urlData, error: urlError } = download
      ? await storage.createSignedUrl(typedDoc.file_path, 3600, { download: typedDoc.name })
      : await storage.createSignedUrl(typedDoc.file_path, 3600)

    if (urlError || !urlData) {
      // On journalise le chemin exact : sans lui, un fichier absent du Storage est
      // indiscernable d'une panne réseau ou d'un défaut de droits.
      console.error(
        '[DOCUMENTS:VIEW] Signed URL error — path:', typedDoc.file_path,
        '| message:', urlError?.message,
      )

      // Cas de loin le plus fréquent : la ligne existe en base mais le fichier n'a
      // jamais été déposé (ou a été supprimé) dans le Storage. « Erreur lors de la
      // génération de l'URL » ne voulait rien dire pour un client — constaté par
      // MiKL le 2026-08-02 sur les documents de démo.
      const isMissingFile = /not found|does not exist|object.*not.*found/i.test(urlError?.message ?? '')

      return errorResponse(
        isMissingFile
          ? 'Ce fichier n\'est plus disponible. Demandez à MiKL de le redéposer.'
          : 'Impossible d\'ouvrir ce document pour le moment. Réessayez dans un instant.',
        isMissingFile ? 'STORAGE_FILE_MISSING' : 'STORAGE_ERROR',
        { message: urlError?.message },
      )
    }

    return successResponse({
      url: urlData.signedUrl,
      document: toDocument(typedDoc),
    })
  } catch (error) {
    console.error('[DOCUMENTS:VIEW] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
