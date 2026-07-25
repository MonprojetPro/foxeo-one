import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Story 13.3 (correctif 2026-07-25) — Impersonation RÉELLE.
//
// Avant ce correctif, « Se connecter comme le client » ouvrait simplement l'app client
// avec `?impersonation_session=<id>` : aucune session d'authentification du compte client
// n'était créée. L'opérateur atterrissait sur /login (ou sur un dashboard vide avec sa
// propre session opérateur, qui n'a pas de ligne dans `clients`). La bannière rouge
// s'affichait, mais l'impersonation n'existait pas.
//
// On génère désormais un vrai jeton de connexion du compte client via l'API admin
// (service role), sur le même modèle que sendWelcomeLabInvite (LOT C). On renvoie le
// `hashed_token` plutôt que le `action_link` : la route /auth/impersonation le consomme
// côté serveur avec verifyOtp() et pose les cookies de session. Ce chemin ne dépend ni
// du flow PKCE ni du flow implicite (pas de token dans le fragment d'URL, inaccessible
// côté serveur).
//
// À n'appeler que côté serveur — nécessite SUPABASE_SERVICE_ROLE_KEY.

export const IMPERSONATION_CALLBACK_PATH = '/auth/impersonation'

/**
 * URL de l'app client multi-tenant. Le fallback vise la PROD (et non localhost) :
 * c'est le même choix que sendWelcomeLabInvite / pennylane-paid-handlers, pour qu'une
 * variable d'env absente sur Vercel ne casse pas la redirection.
 */
export function getClientAppUrl(): string {
  return process.env.NEXT_PUBLIC_CLIENT_URL ?? 'https://app.monprojet-pro.com'
}

export interface BuildImpersonationLinkParams {
  /** Email du compte client à impersonner. */
  email: string
  /** ID de la session d'impersonation déjà créée en base. */
  sessionId: string
  /** Injectable pour les tests — sinon construit depuis les env vars service-role. */
  adminClient?: SupabaseClient
}

export type BuildImpersonationLinkResult =
  | { url: string; error?: undefined }
  | { url?: undefined; error: string }

function buildAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function buildImpersonationLink(
  params: BuildImpersonationLinkParams
): Promise<BuildImpersonationLinkResult> {
  const admin = params.adminClient ?? buildAdminClient()
  if (!admin) {
    return {
      error: 'NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant',
    }
  }

  const clientBase = getClientAppUrl()
  const redirectTo = `${clientBase}${IMPERSONATION_CALLBACK_PATH}`

  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: params.email,
      options: { redirectTo },
    })

    const hashedToken = (
      data as { properties?: { hashed_token?: string } } | null
    )?.properties?.hashed_token

    if (error || !hashedToken) {
      return { error: error?.message ?? 'generateLink: hashed_token vide' }
    }

    const url = new URL(`${clientBase}${IMPERSONATION_CALLBACK_PATH}`)
    url.searchParams.set('token_hash', hashedToken)
    url.searchParams.set('session', params.sessionId)

    return { url: url.toString() }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}
