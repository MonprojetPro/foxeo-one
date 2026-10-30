/**
 * Création de comptes Auth côté serveur (Supabase Admin API).
 *
 * ⚠️ POINT D'ENTRÉE SÉPARÉ — `@monprojetpro/supabase/admin`, jamais l'index principal.
 * Ce fichier utilise `node:crypto` et la SERVICE_ROLE_KEY : l'exporter depuis `index.ts`
 * le ferait entrer dans le bundle navigateur, où webpack ne sait pas résoudre le scheme
 * `node:`. À n'importer que depuis une Server Action, une route webhook ou un RSC.
 *
 * POURQUOI CE CODE VIT ICI ET PLUS DANS LE MODULE FACTURATION
 * Il y a d'abord été écrit pour le tunnel de paiement Pennylane. Quand le flux « créer un
 * espace Lab après une visio » en a eu besoin à son tour, l'importer aurait créé une
 * dépendance visio → facturation, or l'architecture interdit à un module d'en importer un
 * autre (cf. CLAUDE.md). Ce n'est pas de la facturation : c'est de l'authentification
 * Supabase. Sa place est dans le package Supabase partagé.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { getClientAppUrl } from '@monprojetpro/utils'

// Alphabet sans I, O, l, 1, 0 : un mot de passe temporaire peut être lu à voix haute ou
// recopié à la main par un client, ces caractères se confondent.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789-_'

export const TEMP_PASSWORD_LENGTH = 16

/**
 * Mot de passe temporaire jetable. Le client ne le voit jamais : il définit le sien via le
 * lien de récupération qui lui est envoyé. Il n'existe que parce que l'API Admin exige un
 * mot de passe à la création du compte.
 */
export function generateSecureTemporaryPassword(length = TEMP_PASSWORD_LENGTH): string {
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return out
}

export type CreateClientAuthUserResult =
  | { userId: string; error: null }
  | { userId: null; error: { code: string; message: string; details?: unknown } }

export interface CreateClientAuthUserOptions {
  email: string
  password: string
  adminClient?: SupabaseClient
}

function buildAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Crée le compte Auth d'un client. `email_confirm: true` car c'est l'opérateur qui ouvre
 * l'espace : le client n'a pas à confirmer une adresse que MiKL a saisie pour lui.
 *
 * Ne lève jamais : retourne l'erreur pour que l'appelant décide (typiquement : ne pas
 * créer la ligne `clients` si le compte n'a pas pu être créé, afin de ne pas laisser un
 * client orphelin sans moyen de connexion).
 */
export async function createClientAuthUser(
  options: CreateClientAuthUserOptions
): Promise<CreateClientAuthUserResult> {
  const admin = options.adminClient ?? buildAdminClient()
  if (!admin) {
    return {
      userId: null,
      error: {
        code: 'CONFIG_ERROR',
        message:
          'NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant — impossible de creer un compte',
      },
    }
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: options.email,
    password: options.password,
    email_confirm: true,
  })

  if (error || !data?.user) {
    return {
      userId: null,
      error: {
        code: 'AUTH_ADMIN_CREATE_FAILED',
        message: error?.message ?? 'auth.admin.createUser a retourne une reponse vide',
        details: error,
      },
    }
  }

  return { userId: data.user.id, error: null }
}

export type GeneratePasswordSetupLinkResult =
  | { link: string; error: null }
  | { link: null; error: { code: string; message: string; details?: unknown } }

/**
 * Lien à usage unique (`generateLink` type `recovery`) par lequel un client définit
 * lui-même son mot de passe — jamais un mot de passe en clair dans un email. Redirige
 * vers le même chemin public que « mot de passe oublié » (mêmes URLs déjà autorisées
 * côté Supabase). Partagé entre Lab et One pour ne pas dupliquer cette construction.
 */
export async function generatePasswordSetupLink(options: {
  email: string
  adminClient?: SupabaseClient
}): Promise<GeneratePasswordSetupLinkResult> {
  const admin = options.adminClient ?? buildAdminClient()
  if (!admin) {
    return {
      link: null,
      error: {
        code: 'CONFIG_ERROR',
        message:
          'NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant — impossible de generer le lien',
      },
    }
  }

  const redirectTo = `${getClientAppUrl()}/auth/callback?next=/reset-password`

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: options.email,
    options: { redirectTo },
  })
  const link = (data as { properties?: { action_link?: string } } | null)?.properties?.action_link

  if (error || !link) {
    return {
      link: null,
      error: {
        code: 'GENERATE_LINK_FAILED',
        message: error?.message ?? 'generateLink: action_link vide',
        details: error,
      },
    }
  }

  return { link, error: null }
}

export type EnsureClientAuthAccountResult =
  | { authUserId: string; created: boolean; error: null }
  | { authUserId: null; created: false; error: { code: string; message: string; details?: unknown } }

/**
 * Garantit qu'un client a un compte Auth, où que l'activation se déclenche (paiement,
 * activation Lab gratuite, bascule « Accès One », etc.) — un seul endroit qui crée le
 * compte et le lie à `clients.auth_user_id`, pour ne jamais dupliquer cette logique à
 * chaque point d'entrée. `supabase` est le client de la requête courante (RLS), utilisé
 * uniquement pour la liaison ; la création elle-même passe par l'Admin API.
 *
 * Les appelants passent le client typé `SupabaseClient<Database, ...>` de
 * `createServerSupabaseClient()` — à caster en `SupabaseClient` générique à l'appel
 * (`supabase as unknown as SupabaseClient`), même pattern déjà utilisé ailleurs dans ce
 * projet face au bruit `never` de `database.types.ts` désynchronisé du schéma réel.
 */
export async function ensureClientAuthAccount(options: {
  supabase: SupabaseClient
  clientId: string
  email: string | null
  authUserId: string | null
  adminClient?: SupabaseClient
}): Promise<EnsureClientAuthAccountResult> {
  if (options.authUserId) {
    return { authUserId: options.authUserId, created: false, error: null }
  }
  if (!options.email) {
    return {
      authUserId: null,
      created: false,
      error: { code: 'NO_EMAIL', message: 'Le client n\'a pas d\'email — impossible de creer un compte' },
    }
  }

  const authResult = await createClientAuthUser({
    email: options.email,
    password: generateSecureTemporaryPassword(),
    adminClient: options.adminClient,
  })

  if (authResult.error || !authResult.userId) {
    return {
      authUserId: null,
      created: false,
      error: authResult.error ?? { code: 'AUTH_FAILED', message: 'Compte non cree' },
    }
  }

  const { error: linkError } = await options.supabase
    .from('clients')
    .update({ auth_user_id: authResult.userId })
    .eq('id', options.clientId)

  if (linkError) {
    console.error('[SUPABASE:ENSURE_CLIENT_AUTH_ACCOUNT] Liaison clients.auth_user_id echouee:', linkError)
    // Le compte existe quand meme : on le renvoie pour que l'appelant puisse continuer
    // (email, notification) meme si la liaison en base a echoue (consigne en log).
  }

  return { authUserId: authResult.userId, created: true, error: null }
}

// ─── Emails « votre espace est prêt » ──────────────────────────────────────────────
//
// Vivent ici (pas dans le module parcours ni crm) pour la même raison que le reste de
// ce fichier : Lab ET One en ont besoin, et un module ne peut pas en importer un autre
// (cf. CLAUDE.md). Best-effort : l'appelant ne doit JAMAIS échouer si l'envoi échoue.

export interface SendWelcomeLabInviteParams {
  email: string
  clientName: string
  /** Optionnel : le parcours n'est pas forcément composé au moment de l'activation. */
  firstStepLabel?: string
  adminClient?: SupabaseClient
}

export interface SendWelcomeInviteResult {
  success: boolean
  error?: string
}

async function postDirectEmail(
  template: 'welcome-lab' | 'welcome-one',
  to: string,
  data: Record<string, unknown>
): Promise<SendWelcomeInviteResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return { success: false, error: 'NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant' }
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, template, data }),
    })
    if (!response.ok) {
      const text = await response.text()
      return { success: false, error: `send-email ${response.status}: ${text}` }
    }
    const json = (await response.json()) as { success?: boolean; error?: string }
    return { success: json.success === true, error: json.error }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Invitation Lab, envoyée à l'ACTIVATION du Lab (T-067 — plus au lancement du parcours :
 * l'espace doit exister avant même que le parcours soit composé). Lien à usage unique
 * (recovery), jamais de mot de passe en clair.
 */
export async function sendWelcomeLabInvite(
  params: SendWelcomeLabInviteParams
): Promise<SendWelcomeInviteResult> {
  const linkResult = await generatePasswordSetupLink({ email: params.email, adminClient: params.adminClient })
  if (linkResult.error) {
    return { success: false, error: linkResult.error.message }
  }
  return postDirectEmail('welcome-lab', params.email, {
    clientName: params.clientName,
    firstStepLabel: params.firstStepLabel,
    activationLink: linkResult.link,
  })
}

export interface SendWelcomeOneInviteParams {
  email: string
  clientName: string
  adminClient?: SupabaseClient
}

/**
 * Pendant « One » de `sendWelcomeLabInvite` : un client qui accède directement au One
 * (sans jamais passer par le Lab) a besoin du même email « votre espace est prêt », avec
 * un lien à usage unique plutôt qu'un mot de passe en clair.
 */
export async function sendWelcomeOneInvite(
  params: SendWelcomeOneInviteParams
): Promise<SendWelcomeInviteResult> {
  const linkResult = await generatePasswordSetupLink({ email: params.email, adminClient: params.adminClient })
  if (linkResult.error) {
    return { success: false, error: linkResult.error.message }
  }
  return postDirectEmail('welcome-one', params.email, {
    clientName: params.clientName,
    activationLink: linkResult.link,
    temporaryPassword: null,
    needsPasswordSetup: true,
  })
}
