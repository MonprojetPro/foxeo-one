'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import { errorResponse, successResponse, type ActionResponse } from '@foxeo/types'
import type { CustomBranding } from '@foxeo/types'

export async function getClientBranding(
  clientId: string,
): Promise<ActionResponse<CustomBranding | null>> {
  if (!clientId) {
    return errorResponse('ID client requis', 'VALIDATION_ERROR')
  }

  try {
    const supabase = await createServerSupabaseClient()

    const { data: config, error } = await supabase
      .from('client_configs')
      .select('custom_branding')
      .eq('client_id', clientId)
      .maybeSingle()

    if (error) {
      return errorResponse('Erreur de lecture', 'DB_ERROR', error)
    }

    if (!config) {
      return successResponse(null)
    }

    const branding = config.custom_branding as CustomBranding | null
    return successResponse(branding ?? null)
  } catch (error) {
    console.error('[CRM:GET_BRANDING] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
