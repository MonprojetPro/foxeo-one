'use server'

import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { CURRENT_IA_POLICY_VERSION } from '@monprojetpro/utils'

export async function updateIaConsentAction(
  accepted: boolean
): Promise<ActionResponse<{ success: boolean }>> {
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

  // Insert new IA consent (NEVER UPDATE, always INSERT for audit trail)
  const { error: insertError } = await supabase.from('consents').insert({
    client_id: client.id,
    consent_type: 'ia_processing',
    accepted,
    version: CURRENT_IA_POLICY_VERSION,
    ip_address: ip,
    user_agent: userAgent,
  } as any)

  if (insertError) {
    return errorResponse(
      'Erreur lors de la modification du consentement',
      'INSERT_ERROR',
      { details: insertError.message }
    )
  }

  return successResponse({ success: true })
}
