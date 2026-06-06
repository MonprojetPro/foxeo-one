import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { CURRENT_CGU_VERSION, CURRENT_IA_POLICY_VERSION } from '@monprojetpro/utils'
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

/**
 * Vérifie si le client doit re-consentir au traitement IA suite à une évolution
 * de la politique (ex : changement de fournisseur d'IA).
 *
 * ⚠️ Le traitement IA est OPTIONNEL : un client qui n'a jamais consenti (aucune row
 * ia_processing) n'est JAMAIS forcé — il activera Élio quand il le souhaite depuis
 * les paramètres. La redirection ne se déclenche QUE si une décision IA antérieure
 * existe mais porte sur une version périmée de la politique. Tant que
 * CURRENT_IA_POLICY_VERSION n'est pas incrémentée globalement, ce mécanisme ne
 * touche personne — sauf un compte dont la version stockée a été volontairement
 * périmée (ex : compte de test).
 */
export async function checkIaConsentVersion(
  request: NextRequest,
  clientId: string
): Promise<NextResponse | null> {
  const supabase = await createServerSupabaseClient()

  const { data: iaConsent } = (await supabase
    .from('consents')
    .select('version')
    .eq('client_id', clientId)
    .eq('consent_type', 'ia_processing')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()) as { data: { version: string } | null }

  // IA optionnelle : aucun consentement antérieur → on ne force rien.
  if (!iaConsent) {
    return null
  }

  // Une décision IA existe mais sur une version périmée → re-consentement requis.
  if (iaConsent.version !== CURRENT_IA_POLICY_VERSION) {
    return NextResponse.redirect(new URL('/ia-consent-update', request.url))
  }

  return null
}
