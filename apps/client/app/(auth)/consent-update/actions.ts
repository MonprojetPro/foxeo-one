'use server'

import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { CURRENT_CGU_VERSION } from '@monprojetpro/utils'

export async function updateCguConsentAction(): Promise<
  ActionResponse<{ success: boolean }>
> {
  const supabase = await createServerSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return errorResponse('Non authentifié', 'AUTH_ERROR')
  }

  // Get client_id
  const { data: client } = (await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()) as { data: { id: string } | null }

  if (!client) {
    return errorResponse('Client introuvable', 'NOT_FOUND')
  }

  // Get IP and user-agent
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    'unknown'
  const userAgent = headersList.get('user-agent') ?? 'unknown'

  // Insert new CGU consent with current version
  const { error: insertError } = await supabase.from('consents').insert({
    client_id: client.id,
    consent_type: 'cgu',
    accepted: true,
    version: CURRENT_CGU_VERSION,
    ip_address: ip,
    user_agent: userAgent,
  } as any)

  if (insertError) {
    return errorResponse(
      'Erreur lors de l\'enregistrement du consentement',
      'INSERT_ERROR',
      { details: insertError.message }
    )
  }

  return successResponse({ success: true })
}
