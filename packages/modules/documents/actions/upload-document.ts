'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { validateFile } from '@monprojetpro/utils'
import { UploadDocumentInput, type Document, type DocumentDB } from '../types/document.types'
import { toDocument } from '../utils/to-document'

export async function uploadDocument(
  formData: FormData
): Promise<ActionResponse<Document>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const file = formData.get('file') as File | null
    const clientId = formData.get('clientId') as string
    const operatorId = formData.get('operatorId') as string
    const uploadedBy = formData.get('uploadedBy') as string
    const visibility = (formData.get('visibility') as string) || 'private'
    const tagsRaw = formData.get('tags') as string | null

    if (!file) {
      return errorResponse('Aucun fichier fourni', 'VALIDATION_ERROR')
    }

    // Server-side file validation (defense in depth — reuse shared utility)
    const fileValidation = validateFile(file)
    if (!fileValidation.valid) {
      return errorResponse(fileValidation.error ?? 'Fichier invalide', 'VALIDATION_ERROR')
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''

    // Validate structured input
    const parsed = UploadDocumentInput.safeParse({
      clientId,
      operatorId,
      name: file.name,
      fileType: ext,
      fileSize: file.size,
      visibility,
      uploadedBy,
      tags: tagsRaw ? JSON.parse(tagsRaw) : [],
    })

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    // Verify sender identity
    if (uploadedBy === 'operator') {
      const { data: operator } = await supabase
        .from('operators')
        .select('id')
        .eq('id', operatorId)
        .eq('auth_user_id', user.id)
        .single()
      if (!operator) {
        return errorResponse('Non autorisé — opérateur invalide', 'FORBIDDEN')
      }
    } else {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('id', clientId)
        .eq('auth_user_id', user.id)
        .single()
      if (!client) {
        return errorResponse('Non autorisé — client invalide', 'FORBIDDEN')
      }
    }

    // Sanitize filename — Supabase Storage rejects spaces and special chars
    const sanitizedName = file.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')   // remove accents
      .replace(/[^a-zA-Z0-9._-]/g, '-') // replace special chars with dash
      .replace(/-{2,}/g, '-')            // collapse consecutive dashes
      .replace(/^-|-$/g, '')             // trim leading/trailing dashes

    // Upload to Supabase Storage
    const filename = `${crypto.randomUUID()}-${sanitizedName}`
    const storagePath = `${parsed.data.operatorId}/${parsed.data.clientId}/${filename}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, file)

    if (uploadError || !uploadData) {
      console.error('[DOCUMENTS:UPLOAD] Storage error:', uploadError)
      return errorResponse('Échec de l\'upload du fichier', 'STORAGE_ERROR', { message: uploadError?.message })
    }

    // Insert DB record — use exclusively Zod-validated values
    const { data, error } = await supabase
      .from('documents')
      .insert({
        client_id: parsed.data.clientId,
        operator_id: parsed.data.operatorId,
        name: parsed.data.name,
        file_path: uploadData.path,
        file_type: parsed.data.fileType,
        file_size: parsed.data.fileSize,
        visibility: parsed.data.visibility,
        uploaded_by: parsed.data.uploadedBy,
        tags: parsed.data.tags,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('[DOCUMENTS:UPLOAD] DB insert error:', error)
      // Cleanup uploaded file on DB failure
      await supabase.storage.from('documents').remove([storagePath])
      return errorResponse('Échec de la création du document', 'DB_ERROR', { message: error?.message })
    }

    // Log activity — fire-and-forget
    supabase.from('activity_logs').insert({
      actor_type: uploadedBy === 'operator' ? 'operator' : 'client',
      actor_id: uploadedBy === 'operator' ? parsed.data.operatorId : parsed.data.clientId,
      action: 'document_uploaded',
      entity_type: 'client',
      entity_id: parsed.data.clientId,
      metadata: { document_id: data.id, document_name: parsed.data.name, file_type: parsed.data.fileType, visibility: parsed.data.visibility },
    }).then(({ error: logError }) => {
      if (logError) console.error('[DOCUMENTS:UPLOAD] Activity log error:', logError)
    }).catch(() => {})

    return successResponse(toDocument(data as DocumentDB))
  } catch (error) {
    console.error('[DOCUMENTS:UPLOAD] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', { message: error instanceof Error ? error.message : String(error) })
  }
}
