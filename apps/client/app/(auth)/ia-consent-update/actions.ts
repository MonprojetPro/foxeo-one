'use server'

import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { CURRENT_IA_POLICY_VERSION } from '@monprojetpro/utils'

/**
 * Enregistre la décision de re-consentement IA (acceptée ou refusée) suite à une
 * évolution de la politique. INSERT-only (jamais d'UPDATE) pour conserver l'audit
 * trail RGPD. La version enregistrée est toujours CURRENT_IA_POLICY_VERSION, ce qui
 * lève la redirection du middleware au prochain chargement.
 */
export async function submitIaReconsentAction(
  accepted: boolean
): Promise<ActionResponse<{ success: boolean }>> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return errorResponse('Non authentifié', 'AUTH_ERROR')
  }

  const { data: client } = (await supabase
    .from('clients')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()) as { data: { id: string } | null }

  if (!client) {
    return errorResponse('Client introuvable', 'NOT_FOUND')
  }

  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    'unknown'
  const userAgent = headersList.get('user-agent') ?? 'unknown'

   
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
      'Erreur lors de l\'enregistrement de votre choix',
      'INSERT_ERROR',
      { details: insertError.message }
    )
  }

  return successResponse({ success: true })
}
