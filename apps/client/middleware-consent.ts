import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { CURRENT_CGU_VERSION } from '@monprojetpro/utils'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Check if the user has accepted the current CGU version
 * If not, redirect to consent-update interstitial page
 */
export async function checkConsentVersion(
  request: NextRequest,
  clientId: string
): Promise<NextResponse | null> {
  const supabase = await createServerSupabaseClient()

  // Fetch the latest CGU consent for this client
  const { data: consent } = (await supabase
    .from('consents')
    .select('version')
    .eq('client_id', clientId)
    .eq('consent_type', 'cgu')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()) as { data: { version: string } | null }

  // If no consent found or version mismatch, redirect to consent-update
  if (!consent || consent.version !== CURRENT_CGU_VERSION) {
    return NextResponse.redirect(new URL('/consent-update', request.url))
  }

  // Consent is up to date
  return null
}
