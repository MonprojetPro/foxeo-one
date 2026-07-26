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
