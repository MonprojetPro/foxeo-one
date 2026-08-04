import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getHubUrl } from '@monprojetpro/utils'

// Entrée de connexion UNIQUE (décision MiKL du 2026-08-03).
//
// Le site vitrine ne porte aucun formulaire : son bouton « Connexion » pointe vers
// l'unique page de login, hébergée par l'app client. Cette page authentifie tout le
// monde — clients ET opérateur — puis aiguille. Un client reste sur place (Lab ou One
// selon son compte) ; un opérateur doit atterrir sur le Hub, qui vit sur un AUTRE
// sous-domaine et ne partage donc aucun cookie de session.
//
// D'où cette passerelle : après une authentification par mot de passe réussie, on émet
// un jeton de connexion à usage unique du même compte, consommé côté Hub par verifyOtp()
// qui y pose ses propres cookies. Exactement le mécanisme de buildImpersonationLink
// (packages/modules/admin/utils/build-impersonation-link.ts), déjà éprouvé en production.
//
// Ce que la passerelle NE fait PAS : baisser le niveau d'exigence. Le jeton n'est émis
// qu'après vérification du mot de passe, et la session qu'il pose arrive en AAL1 — le
// middleware du Hub réclame donc le code 2FA comme pour n'importe quelle connexion
// directe. Aucun raccourci n'est ouvert.
//
// À n'appeler que côté serveur — nécessite SUPABASE_SERVICE_ROLE_KEY.

export const HUB_HANDOFF_CALLBACK_PATH = '/auth/handoff'

export interface BuildHubHandoffLinkParams {
  /** Email de l'opérateur déjà authentifié par mot de passe. */
  email: string
  /** Injectable pour les tests — sinon construit depuis les env vars service-role. */
  adminClient?: SupabaseClient
}

export type BuildHubHandoffLinkResult =
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

export async function buildHubHandoffLink(
  params: BuildHubHandoffLinkParams
): Promise<BuildHubHandoffLinkResult> {
  const admin = params.adminClient ?? buildAdminClient()
  if (!admin) {
    return { error: 'NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant' }
  }

  const hubBase = getHubUrl()

  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: params.email,
      options: { redirectTo: `${hubBase}${HUB_HANDOFF_CALLBACK_PATH}` },
    })

    // On renvoie le `hashed_token`, jamais l'`action_link` : la route de callback le
    // consomme côté serveur. Ce chemin ne dépend ni du flow PKCE ni du flow implicite
    // (pas de jeton dans le fragment d'URL, inaccessible au serveur).
    const hashedToken = (
      data as { properties?: { hashed_token?: string } } | null
    )?.properties?.hashed_token

    if (error || !hashedToken) {
      return { error: error?.message ?? 'generateLink: hashed_token vide' }
    }

    const url = new URL(`${hubBase}${HUB_HANDOFF_CALLBACK_PATH}`)
    url.searchParams.set('token_hash', hashedToken)

    return { url: url.toString() }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}
