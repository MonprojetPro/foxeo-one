/**
 * URLs des deux déploiements — source unique de vérité.
 *
 * ⚠️ Les sous-domaines custom `app.monprojet-pro.com` / `hub.monprojet-pro.com` NE SONT
 * PAS branchés en DNS (constaté le 2026-07-25 : DNS_PROBE_FINISHED_NXDOMAIN). Les
 * défauts sont donc les URLs Vercel réelles, alignées sur
 * `supabase/functions/send-email/handler.ts` (buildPlatformUrl). Le jour où le DNS est
 * en place, il suffit de définir les variables d'env — ou de changer ces deux constantes.
 *
 * `lab.monprojet-pro.com` n'existe pas — ne jamais l'utiliser.
 *
 * Historique : chaque appelant avait son propre `?? '...'`, avec trois valeurs
 * différentes (localhost:3000, app.monprojet-pro.com, chaîne vide). Résultat : liens
 * d'invitation Lab et d'activation après paiement envoyés vers un domaine inexistant,
 * et impersonation renvoyant sur localhost.
 */

export const DEFAULT_CLIENT_APP_URL = 'https://monprojetpro-client.vercel.app'
export const DEFAULT_HUB_URL = 'https://monprojetpro-hub.vercel.app'

/** Site vitrine — lui EST branché en DNS (vérifié le 2026-08-03 : HTTP 200). */
export const DEFAULT_SITE_URL = 'https://www.monprojet-pro.com'

/**
 * Chemin de l'entrée de connexion UNIQUE (décision MiKL du 2026-08-03).
 *
 * Le site vitrine ne porte aucun formulaire et ne voit jamais un mot de passe : son
 * bouton « Connexion » pointe ici. Cette page authentifie, puis aiguille elle-même —
 * client vers Lab/One, opérateur vers le Hub. L'utilisateur ne choisit jamais son
 * dashboard, il n'a qu'une seule adresse à retenir.
 */
export const LOGIN_ENTRY_PATH = '/login'

function sanitize(url: string | undefined, fallback: string): string {
  const value = url?.trim()
  if (!value) return fallback
  // Une base avec slash final produirait des `//login` dans les liens construits.
  return value.replace(/\/+$/, '')
}

/** URL publique de l'app client multi-tenant (Lab + One). */
export function getClientAppUrl(): string {
  return sanitize(process.env.NEXT_PUBLIC_CLIENT_URL, DEFAULT_CLIENT_APP_URL)
}

/** URL publique du Hub (cockpit MiKL). */
export function getHubUrl(): string {
  return sanitize(process.env.NEXT_PUBLIC_HUB_URL, DEFAULT_HUB_URL)
}

/** URL publique du site vitrine — porte d'entrée de la connexion. */
export function getSiteUrl(): string {
  return sanitize(process.env.NEXT_PUBLIC_SITE_URL, DEFAULT_SITE_URL)
}

/**
 * URL complète de l'entrée de connexion unique — la seule à communiquer (site
 * vitrine, emails, documentation). Elle suit automatiquement la bascule de domaine.
 */
export function getLoginEntryUrl(): string {
  return `${getClientAppUrl()}${LOGIN_ENTRY_PATH}`
}
