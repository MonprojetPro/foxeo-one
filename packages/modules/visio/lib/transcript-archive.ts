/**
 * Dépôt de la transcription d'une visio dans le DOSSIER DU CLIENT — T-050.
 *
 * Demande de MiKL (11-10) : *« il faudrait pouvoir la récupérer et la mettre
 * dans le dossier du client »*.
 *
 * 🔑 POURQUOI GOOGLE PRODUIT LE PDF, ET PAS NOUS. Ce projet n'a aucun
 * générateur de PDF côté serveur : `generatePdf` du module documents rend du
 * HTML que le NAVIGATEUR imprime. Depuis un cron, il n'y a pas de navigateur.
 * L'API Drive sait exporter un Google Doc en PDF (`files/{id}/export`) — c'est
 * la seule voie serveur honnête. Et elle évite la rasterisation par capture,
 * qui tranche le texte tous les 297 mm (leçon `pdf-jamais-par-capture-canvas`).
 *
 * ⚠️ L'export exige le scope `drive.readonly`. S'il manque, Google répond 403.
 * On NE BLOQUE PAS pour autant : on dépose alors un `.txt` construit à partir
 * de `transcript_text` déjà en base. Un compte rendu en texte brut vaut mieux
 * qu'un dossier vide — et le rapport dit lequel des deux a été déposé.
 *
 * ⚠️ Ce fichier n'est PAS un module de Server Actions : il exporte des valeurs
 * et des types, ce qu'un fichier `'use server'` interdit (leçon
 * `use-server-exports-async-only` — `next build` casse, pas `tsc`).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  TRANSCRIPT_FOLDER_NAME,
  buildTranscriptDocumentName,
  sanitizeStorageFileName,
} from '../utils/transcript-document'

export type ArchiveFormat = 'pdf' | 'txt'

export interface ArchiveTranscriptInput {
  meetingId: string
  clientId: string
  operatorId: string
  meetingTitle: string
  /** Date affichée dans le nom du document (fin de visio, sinon date prévue). */
  meetingDateIso: string | null
  recordingId: string
  googleDocumentId: string | null
  /** Repli quand l'export PDF est refusé : le texte déjà extrait en base. */
  transcriptText: string | null
  accessToken: string
}

export interface ArchiveTranscriptResult {
  documentId: string
  format: ArchiveFormat
}

export type ArchiveFailureReason =
  | 'no_source' // ni document Google exploitable, ni texte de repli
  | 'storage_error'
  | 'db_error'
  | 'already_archived' // un passage concurrent a déposé le compte rendu en premier

export type ArchiveTranscriptOutcome =
  | { ok: true; result: ArchiveTranscriptResult }
  | { ok: false; reason: ArchiveFailureReason; detail?: string }

const DRIVE_EXPORT_BASE = 'https://www.googleapis.com/drive/v3/files'

/**
 * Récupère le PDF du Google Doc. `null` si Google refuse (scope manquant,
 * document supprimé) — l'appelant se rabat alors sur le texte.
 */
async function exportGoogleDocAsPdf(
  documentId: string,
  accessToken: string
): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      `${DRIVE_EXPORT_BASE}/${encodeURIComponent(documentId)}/export?mimeType=application%2Fpdf`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) {
      console.warn(
        `[VISIO:ARCHIVE] Export PDF refusé par Drive (${res.status}) — scope drive.readonly manquant ? Repli sur le texte brut.`
      )
      return null
    }
    return await res.arrayBuffer()
  } catch (err) {
    console.warn('[VISIO:ARCHIVE] Export PDF impossible — repli sur le texte brut:', err)
    return null
  }
}

/**
 * Dossier « Comptes rendus de visio » du client — créé s'il n'existe pas.
 * Un échec ici n'est pas bloquant : le document est alors déposé à la racine
 * du dossier client plutôt que perdu.
 */
async function resolveTranscriptFolderId(
  supabase: SupabaseClient,
  clientId: string,
  operatorId: string
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('document_folders')
    .select('id')
    .eq('client_id', clientId)
    .eq('name', TRANSCRIPT_FOLDER_NAME)
    .is('parent_id', null)
    .limit(1)
    .maybeSingle()

  if (existing?.id) return existing.id as string

  const { data: created, error } = await supabase
    .from('document_folders')
    .insert({ client_id: clientId, operator_id: operatorId, name: TRANSCRIPT_FOLDER_NAME })
    .select('id')
    .single()

  if (error || !created) {
    console.warn(
      '[VISIO:ARCHIVE] Dossier « Comptes rendus de visio » non créé — dépôt à la racine:',
      error?.message
    )
    return null
  }
  return created.id as string
}

export async function archiveTranscriptToClientFolder(
  supabase: SupabaseClient,
  input: ArchiveTranscriptInput
): Promise<ArchiveTranscriptOutcome> {
  // 1. Le contenu : PDF produit par Google, sinon texte déjà en base.
  let body: Uint8Array | null = null
  let format: ArchiveFormat = 'pdf'
  let contentType = 'application/pdf'

  if (input.googleDocumentId) {
    const pdf = await exportGoogleDocAsPdf(input.googleDocumentId, input.accessToken)
    if (pdf) body = new Uint8Array(pdf)
  }

  if (!body) {
    if (!input.transcriptText || input.transcriptText.trim().length === 0) {
      return { ok: false, reason: 'no_source' }
    }
    body = new TextEncoder().encode(input.transcriptText)
    format = 'txt'
    contentType = 'text/plain; charset=utf-8'
  }

  // 2. Le dépôt dans le stockage — même arborescence que `uploadDocument`,
  //    pour que les règles de lecture existantes s'appliquent telles quelles.
  const documentName = buildTranscriptDocumentName(
    input.meetingTitle,
    input.meetingDateIso,
    format
  )
  const storagePath = `${input.operatorId}/${input.clientId}/${crypto.randomUUID()}-${sanitizeStorageFileName(documentName)}`

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, body, { contentType, upsert: false })

  if (uploadError) {
    console.error('[VISIO:ARCHIVE] Upload storage échoué:', uploadError.message)
    return { ok: false, reason: 'storage_error', detail: uploadError.message }
  }

  // 3. La ligne `documents` — sans elle, le fichier existe mais reste invisible.
  const folderId = await resolveTranscriptFolderId(supabase, input.clientId, input.operatorId)

  const { data: document, error: insertError } = await supabase
    .from('documents')
    .insert({
      client_id: input.clientId,
      operator_id: input.operatorId,
      name: documentName,
      file_path: storagePath,
      file_type: format,
      file_size: body.byteLength,
      folder_id: folderId,
      // PRIVÉ par défaut : une transcription brute peut contenir des propos
      // qui ne sont pas destinés au client. Le partage reste une décision.
      visibility: 'private',
      uploaded_by: 'operator',
      tags: ['visio', 'transcription'],
    })
    .select('id')
    .single()

  if (insertError || !document) {
    // Le fichier orphelin est retiré : sinon il occupe le stockage sans
    // qu'aucun écran ne puisse le montrer ni le supprimer.
    await supabase.storage.from('documents').remove([storagePath])
    console.error('[VISIO:ARCHIVE] Insertion documents échouée:', insertError?.message)
    return { ok: false, reason: 'db_error', detail: insertError?.message }
  }

  // 4. Le lien retour — c'est lui qui empêche le second dépôt du même compte
  //    rendu. La condition `is null` est LE verrou : le cron (toutes les 15
  //    min) et le bouton « Récupérer maintenant » peuvent partir en même
  //    temps. Sans elle, les deux déposeraient chacun leur document et le
  //    second écraserait simplement le lien du premier — MiKL se retrouverait
  //    avec deux fois le même compte rendu dans le dossier, dont un orphelin.
  const { data: linked, error: linkError } = await supabase
    .from('meeting_recordings')
    .update({
      transcript_document_id: document.id,
      transcript_archived_at: new Date().toISOString(),
    })
    .eq('id', input.recordingId)
    .is('transcript_document_id', null)
    .select('id')

  if (linkError) {
    console.error('[VISIO:ARCHIVE] Lien transcript_document_id non écrit:', linkError.message)
    return { ok: false, reason: 'db_error', detail: linkError.message }
  }

  if (!linked || linked.length === 0) {
    // Un autre passage a gagné la course : on retire CE document-ci plutôt que
    // de laisser deux exemplaires dans le dossier du client.
    await supabase.from('documents').delete().eq('id', document.id)
    await supabase.storage.from('documents').remove([storagePath])
    console.warn('[VISIO:ARCHIVE] Dépôt concurrent détecté — doublon retiré.')
    return { ok: false, reason: 'already_archived' }
  }

  // 5. Journal — fire-and-forget, comme `uploadDocument`.
  void supabase
    .from('activity_logs')
    .insert({
      actor_type: 'system',
      actor_id: input.operatorId,
      action: 'document_uploaded',
      entity_type: 'client',
      entity_id: input.clientId,
      metadata: {
        document_id: document.id,
        document_name: documentName,
        file_type: format,
        source: 'visio_transcript',
        meeting_id: input.meetingId,
      },
    })
    .then(({ error }) => {
      if (error) console.error('[VISIO:ARCHIVE] Journal non écrit:', error.message)
    })

  return { ok: true, result: { documentId: document.id as string, format } }
}
