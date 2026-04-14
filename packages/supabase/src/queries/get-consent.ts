import { createServerSupabaseClient } from '../server'
import type { ActionResponse, ActionError } from '@monprojetpro/types'

interface Consent {
  id: string
  client_id: string
  consent_type: string
  accepted: boolean
  version: string
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

/**
 * Check if a client has accepted IA processing
 * Returns the latest consent status
 */
export async function hasIaConsent(clientId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('consents')
    .select('accepted')
    .eq('client_id', clientId)
    .eq('consent_type', 'ia_processing')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle() as { data: { accepted: boolean } | null; error: unknown }

  if (error || !data) return false

  return data.accepted
}

/**
 * Get the latest consents for a client (CGU + IA)
 * Groups by consent_type and returns the most recent for each
 */
export async function getLatestConsents(clientId: string): Promise<
  ActionResponse<{
    cgu: Consent | null
    ia: Consent | null
  }>
> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = (await supabase
    .from('consents')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })) as { data: Consent[] | null; error: unknown }

  if (error) {
    return {
      data: null,
      error: {
        message: 'Erreur lors de la récupération des consentements',
        code: 'FETCH_ERROR',
        details: error,
      } as ActionError,
    }
  }

  // Group by consent_type and take the most recent
  const cguConsent = data?.find((c) => c.consent_type === 'cgu') ?? null
  const iaConsent = data?.find((c) => c.consent_type === 'ia_processing') ?? null

  return {
    data: {
      cgu: cguConsent,
      ia: iaConsent,
    },
    error: null,
  }
}
