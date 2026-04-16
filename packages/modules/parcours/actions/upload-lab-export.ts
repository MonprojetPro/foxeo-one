'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

const SIGNED_URL_EXPIRY_SECONDS = 14 * 24 * 3600 // 14 days

export async function uploadLabExport(
  clientId: string,
  zipBuffer: Buffer
): Promise<ActionResponse<{ zipUrl: string; expiresAt: string }>> {
  try {
    const supabase = await createServerSupabaseClient()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const storagePath = `${clientId}/${timestamp}.zip`

    // Upload ZIP to exports bucket
    const { error: uploadError } = await supabase
      .storage
      .from('exports')
      .upload(storagePath, zipBuffer, {
        contentType: 'application/zip',
        upsert: false,
      })

    if (uploadError) {
      return errorResponse(`Erreur upload ZIP : ${uploadError.message}`, 'STORAGE_ERROR')
    }

    // Generate signed URL (14 days)
    const { data: signedUrlData, error: signedError } = await supabase
      .storage
      .from('exports')
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS)

    if (signedError || !signedUrlData?.signedUrl) {
      return errorResponse(
        `Erreur génération lien signé : ${signedError?.message ?? 'URL vide'}`,
        'STORAGE_ERROR'
      )
    }

    const expiresAt = new Date(Date.now() + SIGNED_URL_EXPIRY_SECONDS * 1000).toISOString()

    return successResponse({
      zipUrl: signedUrlData.signedUrl,
      expiresAt,
    })
  } catch (err) {
    return errorResponse(
      `Erreur upload export : ${err instanceof Error ? err.message : String(err)}`,
      'INTERNAL_ERROR'
    )
  }
}
