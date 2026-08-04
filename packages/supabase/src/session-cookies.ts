import type { CookieToSet } from './cookie-types'

/**
 * Cookies de session — la session meurt avec le navigateur (décision MiKL du 2026-08-04).
 *
 * Un cookie sans `Max-Age` ni `Expires` est un « cookie de session » : le navigateur
 * l'oublie en se fermant. C'est l'équivalent le plus proche de « je ferme mon ordinateur,
 * je suis déconnecté ».
 *
 * ⚠️ Pourquoi il faut retirer ces attributs à la main : @supabase/ssr applique
 * `maxAge: DEFAULT_COOKIE_OPTIONS.maxAge` (400 jours) EN DERNIER lors de la fusion
 * (`cookies.js:171` en 0.6.1). Passer `cookieOptions.maxAge` ne sert donc à rien —
 * la bibliothèque l'écrase. Le seul point de contrôle est notre propre `setAll`.
 *
 * Activé par déploiement, via `NEXT_PUBLIC_AUTH_SESSION_COOKIES` : posé sur le Hub,
 * absent sur l'app client. Les clients gardent des sessions longues — leur imposer une
 * reconnexion à chaque ouverture de navigateur serait une friction quotidienne pour une
 * menace qui ne les concerne pas.
 */

/** Le déploiement courant doit-il poser des cookies de session ? */
export function useSessionCookies(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_SESSION_COOKIES === 'true'
}

type CookieOptions = CookieToSet['options']

/**
 * Retire la persistance des options d'un cookie.
 *
 * `maxAge: 0` est conservé tel quel : c'est une SUPPRESSION de cookie, pas une durée
 * de vie. La confondre avec de la persistance empêcherait la déconnexion de nettoyer
 * quoi que ce soit.
 */
export function stripCookiePersistence(options: CookieOptions): CookieOptions {
  if (!options) return options
  if (options.maxAge === 0) return options
  const { maxAge: _maxAge, expires: _expires, ...rest } = options
  return rest
}

/** Applique `stripCookiePersistence` à toute une fournée, si le mode est actif. */
export function applySessionCookiePolicy(cookiesToSet: CookieToSet[]): CookieToSet[] {
  if (!useSessionCookies()) return cookiesToSet
  return cookiesToSet.map((cookie) => ({
    ...cookie,
    options: stripCookiePersistence(cookie.options),
  }))
}

/**
 * Sérialise un cookie pour `document.cookie` (navigateur).
 *
 * Nécessaire parce que le client navigateur de @supabase/ssr écrit les cookies lui-même,
 * avec les mêmes 400 jours : sans cet adaptateur, le premier rafraîchissement de jeton
 * reposerait un cookie persistant et « fermer le navigateur » ne déconnecterait plus.
 */
export function serializeBrowserCookie(
  name: string,
  value: string,
  options: CookieOptions,
  isSecureContext: boolean
): string {
  const text = (key: string): string | undefined => {
    const raw = options?.[key]
    return typeof raw === 'string' ? raw : undefined
  }

  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`]

  parts.push(`Path=${text('path') ?? '/'}`)
  parts.push(`SameSite=${text('sameSite') ?? 'Lax'}`)

  const domain = text('domain')
  if (domain) parts.push(`Domain=${domain}`)

  const secure = options?.secure
  if (typeof secure === 'boolean' ? secure : isSecureContext) parts.push('Secure')

  // Seule persistance conservée : la suppression explicite.
  if (options?.maxAge === 0) parts.push('Max-Age=0')

  return parts.join('; ')
}

/**
 * Décodage tolérant : `decodeURIComponent` LÈVE une erreur sur un `%` isolé
 * (`decodeURIComponent('100%')` → URIError). `document.cookie` contient les cookies
 * de tout le domaine, y compris ceux d'outils tiers qui n'encodent rien — une seule
 * valeur mal formée ferait échouer la lecture de TOUS les cookies, donc l'authentification
 * entière côté navigateur. On rend alors la valeur brute plutôt que de tout perdre.
 */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** Découpe `document.cookie` en paires nom/valeur. */
export function parseBrowserCookies(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) return []
  return cookieHeader
    .split('; ')
    .filter(Boolean)
    .map((pair) => {
      const separator = pair.indexOf('=')
      // Un cookie sans `=` n'est pas exploitable : on le rend avec une valeur vide
      // plutôt que de le laisser corrompre le découpage des suivants.
      if (separator === -1) return { name: safeDecode(pair), value: '' }
      return {
        name: safeDecode(pair.slice(0, separator)),
        value: safeDecode(pair.slice(separator + 1)),
      }
    })
}
