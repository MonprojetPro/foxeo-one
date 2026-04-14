'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function uploadScreenshot(
  formData: FormData
): Promise<ActionResponse<string>> {
  try {
    const file = formData.get('screenshot') as File | null
    if (!file) {
      return errorResponse('Aucun fichier fourni', 'VALIDATION_ERROR')
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse('Format non supporté. Utilisez PNG, JPG ou WebP.', 'VALIDATION_ERROR')
    }

    if (file.size > MAX_SIZE) {
      return errorResponse('Fichier trop volumineux (max 5 Mo)', 'VALIDATION_ERROR')
    }

    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const rawExt = file.name.split('.').pop()?.toLowerCase() ?? 'png'
    const ext = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : 'png'
    const filename = `${user.id}/${crypto.randomUUID()}.${ext}`

    const { data, error } = await supabase.storage
      .from('screenshots')
      .upload(filename, file, { contentType: file.type })

    if (error) {
      console.error('[SUPPORT:UPLOAD] Storage error:', error)
      return errorResponse('Échec de l\'upload', 'STORAGE_ERROR', error)
    }

    const { data: { publicUrl } } = supabase.storage
      .from('screenshots')
      .getPublicUrl(data.path)

    return successResponse(publicUrl)
  } catch (error) {
    console.error('[SUPPORT:UPLOAD] Unexpected error:', error)
    return errorResponse('Erreur interne', 'INTERNAL_ERROR', error)
  }
}
