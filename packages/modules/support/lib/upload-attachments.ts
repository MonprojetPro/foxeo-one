// ============================================================
// Dépôt direct navigateur -> Supabase Storage (pattern GuardVeto)
// ============================================================
// Le fichier ne passe PAS par une Server Action / Route API : il part
// directement du navigateur vers Supabase, avec la session de la personne
// connectée. Ça élimine par construction toute limite de taille de requête
// côté Next.js (cf. bug du 2026-08-31 : la limite par défaut de 1 Mo bloquait
// l'ancien chemin serveur en silence).
//
// Le dépôt des fichiers et la création du ticket sont deux gestes distincts :
// si le second échoue, le premier a déjà eu lieu — cleanupUploadedAttachments
// retire alors ce qui vient d'être déposé pour ne rien laisser d'orphelin.

import { createClient } from '@monprojetpro/supabase'
import { compressImageIfPossible } from './compress-image'
import { sanitizeFileName } from './attachment-constraints'

const BUCKET = 'screenshots'

export interface UploadedAttachment {
  path: string
  publicUrl: string
}

export class AttachmentUploadError extends Error {
  constructor(
    message: string,
    public readonly fileName: string
  ) {
    super(message)
  }
}

/**
 * Compresse (si c'est une image) puis dépose chaque fichier chez Supabase.
 * S'arrête au premier échec — les fichiers déjà déposés doivent être
 * retirés par l'appelant via `cleanupUploadedAttachments`.
 */
export async function uploadAttachments(
  files: File[],
  ticketId: string
): Promise<UploadedAttachment[]> {
  if (files.length === 0) return []

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new AttachmentUploadError('Non authentifié', '')
  }

  const uploaded: UploadedAttachment[] = []

  for (const [i, original] of files.entries()) {
    const file = await compressImageIfPossible(original)
    const path = `${user.id}/${ticketId}/${i + 1}-${sanitizeFileName(file.name)}`

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })

    if (error) {
      throw new AttachmentUploadError(
        `« ${original.name} » n'a pas pu être déposé (${error.message}).`,
        original.name
      )
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path)

    uploaded.push({ path, publicUrl })
  }

  return uploaded
}

/** Retire des pièces déjà déposées quand la suite du geste (créer le ticket) a échoué. */
export async function cleanupUploadedAttachments(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const supabase = createClient()
  const { error } = await supabase.storage.from(BUCKET).remove(paths)
  if (error) {
    console.warn('[SUPPORT:UPLOAD] Fichiers orphelins non retirés :', error.message)
  }
}
