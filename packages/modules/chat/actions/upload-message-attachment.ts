'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@foxeo/types'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
])
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const BUCKET = 'chat-attachments'

export interface AttachmentUploadResult {
  url: string
  name: string
  type: string
}

/**
 * Server Action — Upload d'une pièce jointe de message vers Supabase Storage.
 * Retourne toujours { data, error } — jamais throw.
 */
export async function uploadMessageAttachment(
  formData: FormData
): Promise<ActionResponse<AttachmentUploadResult>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const file = formData.get('file') as File | null
    const clientId = formData.get('clientId') as string | null
    const operatorId = formData.get('operatorId') as string | null

    if (!file) {
      return errorResponse('Aucun fichier fourni', 'VALIDATION_ERROR')
    }
    if (!clientId || !operatorId) {
      return errorResponse('clientId et operatorId sont requis', 'VALIDATION_ERROR')
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return errorResponse(
        'Type de fichier non autorisé. Formats acceptés : JPG, PNG, GIF, WEBP, PDF',
        'VALIDATION_ERROR'
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return errorResponse('Fichier trop volumineux (max 10 Mo)', 'VALIDATION_ERROR')
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const uniqueName = `${crypto.randomUUID()}.${ext}`
    const storagePath = `${operatorId}/${clientId}/${uniqueName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { contentType: file.type })

    if (uploadError || !uploadData) {
      console.error('[CHAT:UPLOAD_ATTACHMENT] Storage error:', uploadError)
      return errorResponse("Échec de l'upload du fichier", 'STORAGE_ERROR', uploadError)
    }

    // Generate a long-lived signed URL (7 days)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(uploadData.path, 60 * 60 * 24 * 7)

    if (signedUrlError || !signedUrlData?.signedUrl) {
      // Cleanup on failure
      await supabase.storage.from(BUCKET).remove([uploadData.path])
      return errorResponse("Échec de la génération de l'URL signée", 'STORAGE_ERROR', signedUrlError)
    }

    return successResponse({
      url: signedUrlData.signedUrl,
      name: file.name,
      type: file.type,
    })
  } catch (error) {
    console.error('[CHAT:UPLOAD_ATTACHMENT] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
