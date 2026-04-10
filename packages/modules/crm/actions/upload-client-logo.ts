'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { errorResponse, successResponse, type ActionResponse } from '@monprojetpro/types'

const ALLOWED_TYPES = ['image/png', 'image/svg+xml'] as const
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo

const UploadLogoSchema = z.object({
  clientId: z.string().uuid('ID client invalide'),
})

export async function uploadClientLogo(
  clientId: string,
  formData: FormData,
): Promise<ActionResponse<{ logoUrl: string }>> {
  const parsed = UploadLogoSchema.safeParse({ clientId })
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
    return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return errorResponse('Fichier requis', 'VALIDATION_ERROR')
  }

  if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    return errorResponse('Type de fichier non supporté. Formats acceptés : PNG, SVG', 'INVALID_FILE_TYPE')
  }

  if (file.size > MAX_FILE_SIZE) {
    return errorResponse('Le fichier dépasse la taille maximale de 10 Mo', 'FILE_TOO_LARGE')
  }

  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    // Verify client belongs to operator
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, operator_id')
      .eq('id', clientId)
      .eq('operator_id', operator.id)
      .single()

    if (clientError || !client) {
      return errorResponse('Client introuvable', 'NOT_FOUND')
    }

    const ext = file.type === 'image/svg+xml' ? 'svg' : 'png'
    const storagePath = `clients/${clientId}/branding/logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('client-assets')
      .upload(storagePath, file, { upsert: true })

    if (uploadError) {
      console.error('[CRM:UPLOAD_LOGO] Upload error:', uploadError)
      return errorResponse('Erreur lors de l\'upload du logo', 'STORAGE_ERROR', uploadError)
    }

    const { data: urlData } = supabase.storage
      .from('client-assets')
      .getPublicUrl(storagePath)

    return successResponse({ logoUrl: urlData.publicUrl })
  } catch (error) {
    console.error('[CRM:UPLOAD_LOGO] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
