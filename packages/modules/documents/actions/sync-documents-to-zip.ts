'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { SyncDocumentsInput, type DocumentDB } from '../types/document.types'
import { generateZipFromDocuments, type ZipFileEntry } from '../utils/zip-generator'

// Seuil en bytes au-delà duquel on loggue un avertissement (50 Mo)
const SYNC_SIZE_WARNING_BYTES = 50 * 1024 * 1024
// Taille max base64 pour Server Action response (~3 Mo décodé = ~4 Mo base64)
const MAX_BASE64_RESPONSE_BYTES = 3 * 1024 * 1024

export interface SyncDocumentsResult {
  zipBase64?: string
  zipUrl?: string
  count: number
}

/**
 * Génère une archive ZIP (base64) de tous les documents `visibility='shared'` d'un client.
 * Met à jour last_synced_at pour chaque document inclus.
 * Trace l'opération dans activity_logs.
 *
 * Architecture: Server Action — mutations uniquement (CLAUDE.md)
 *
 * TODO Phase 2: Sync automatique via Supabase Edge Function
 * Trigger: UPDATE sur documents WHERE visibility='shared'
 * Edge Function: supabase/functions/sync-document/index.ts
 * - Récupère le fichier depuis Storage
 * - Écrit dans le dossier BMAD via API filesystem ou mount partagé
 * - Met à jour last_synced_at
 * Prérequis: accès réseau au dossier BMAD local (VPN, mount NFS, ou API agent local)
 */
export async function syncDocumentsToZip(
  clientId: string
): Promise<ActionResponse<SyncDocumentsResult>> {
  try {
    const parsed = SyncDocumentsInput.safeParse({ clientId })
    if (!parsed.success) {
      return errorResponse('clientId invalide', 'VALIDATION_ERROR', parsed.error.issues)
    }

    const supabase = await createServerSupabaseClient()

    // Auth — opérateur uniquement
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data: operator } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    if (!operator) {
      return errorResponse('Accès refusé — opérateur requis', 'FORBIDDEN')
    }

    // Vérifier que le client appartient à cet opérateur
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', parsed.data.clientId)
      .eq('operator_id', operator.id)
      .single()
    if (!client) {
      return errorResponse('Client introuvable', 'NOT_FOUND')
    }

    // Charger les documents partagés du client
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('client_id', parsed.data.clientId)
      .eq('visibility', 'shared')

    if (docsError) {
      console.error('[DOCUMENTS:SYNC_ZIP] Erreur chargement documents:', docsError)
      return errorResponse('Erreur lors du chargement des documents', 'DB_ERROR', docsError)
    }

    // Cast documenté : Supabase .select('*') retourne la shape exacte de DocumentDB
    // Le cast est nécessaire car le type inféré est PostgrestSingleResponse<unknown[]>
    const documents = (docs ?? []) as DocumentDB[]

    if (documents.length === 0) {
      // ZIP vide via le générateur standard
      const emptyZipBuffer = await generateZipFromDocuments([])
      return successResponse({ zipBase64: emptyZipBuffer.toString('base64'), count: 0 })
    }

    // Générer les signed URLs pour chaque document
    const filesWithUrls: Array<{ name: string; url: string; id: string; size: number }> = []
    let totalSize = 0

    for (const doc of documents) {
      const { data: urlData, error: urlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 300) // 5 minutes

      if (urlError || !urlData) {
        console.error(`[DOCUMENTS:SYNC_ZIP] Signed URL failed for doc ${doc.id}:`, urlError)
        return errorResponse(
          `Impossible de générer l'URL pour "${doc.name}"`,
          'STORAGE_ERROR',
          urlError
        )
      }

      filesWithUrls.push({
        name: doc.name,
        url: urlData.signedUrl,
        id: doc.id,
        size: doc.file_size,
      })
      totalSize += doc.file_size
    }

    // Avertissement si total > 50 Mo (ne bloque pas)
    if (totalSize > SYNC_SIZE_WARNING_BYTES) {
      console.warn(
        `[DOCUMENTS:SYNC_ZIP] Total documents size ${(totalSize / 1024 / 1024).toFixed(1)} Mo > 50 Mo — génération quand même`
      )
    }

    // Générer le ZIP
    const zipBuffer = await generateZipFromDocuments(
      filesWithUrls.map(({ name, url }) => ({ name, url }))
    )

    const syncedAt = new Date().toISOString()
    const documentIds = filesWithUrls.map((f) => f.id)

    // Vérifier la taille du ZIP avant de l'encoder en base64
    // Si > 3 Mo → upload vers Storage temporaire et retourner signed URL
    let zipBase64: string | undefined
    let zipUrl: string | undefined

    if (zipBuffer.length > MAX_BASE64_RESPONSE_BYTES) {
      console.warn(
        `[DOCUMENTS:SYNC_ZIP] ZIP trop volumineux (${(zipBuffer.length / 1024 / 1024).toFixed(1)} Mo) — upload vers Storage temporaire`
      )

      const tempFileName = `sync-${parsed.data.clientId}-${Date.now()}.zip`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('temp-exports')
        .upload(tempFileName, zipBuffer, {
          contentType: 'application/zip',
          cacheControl: '600', // 10 minutes
        })

      if (uploadError || !uploadData) {
        console.error('[DOCUMENTS:SYNC_ZIP] Upload Storage temporaire échoué:', uploadError)
        return errorResponse(
          'ZIP trop volumineux et upload temporaire échoué',
          'STORAGE_ERROR',
          uploadError
        )
      }

      // Générer signed URL avec TTL 10 minutes
      const { data: urlData, error: urlError } = await supabase.storage
        .from('temp-exports')
        .createSignedUrl(uploadData.path, 600)

      if (urlError || !urlData) {
        console.error('[DOCUMENTS:SYNC_ZIP] Signed URL temporaire échoué:', urlError)
        return errorResponse('Erreur génération URL temporaire', 'STORAGE_ERROR', urlError)
      }

      zipUrl = urlData.signedUrl
    } else {
      zipBase64 = zipBuffer.toString('base64')
    }

    // Mettre à jour last_synced_at pour chaque document inclus (subtask 2.3)
    const { error: updateError } = await supabase
      .from('documents')
      .update({ last_synced_at: syncedAt })
      .in('id', documentIds)

    if (updateError) {
      console.error('[DOCUMENTS:SYNC_ZIP] Erreur mise à jour last_synced_at:', updateError)
      // Non bloquant — le ZIP est déjà généré
    }

    // Tracer dans activity_logs (subtask 2.4)
    const { error: logError } = await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operator.id,
      action: 'documents_synced',
      entity_type: 'client',
      entity_id: parsed.data.clientId,
      metadata: {
        count: documentIds.length,
        documentIds,
        syncedAt,
      },
    })

    if (logError) {
      console.error('[DOCUMENTS:SYNC_ZIP] Erreur activity_logs:', logError)
      // Non bloquant — le ZIP est déjà généré
    }

    console.info(
      `[DOCUMENTS:SYNC_ZIP] ${documentIds.length} documents synchronisés pour client ${parsed.data.clientId} (${zipBase64 ? 'base64' : 'Storage URL'})`
    )
    return successResponse({
      zipBase64,
      zipUrl,
      count: documentIds.length,
    })
  } catch (error) {
    console.error('[DOCUMENTS:SYNC_ZIP] Erreur inattendue:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
