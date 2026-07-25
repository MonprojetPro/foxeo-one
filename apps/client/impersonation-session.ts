// Story 13.3 (correctif 2026-07-25) — Source unique de vérité du cookie d'impersonation.
//
// Partagé par le middleware, la route /auth/impersonation et le layout (dashboard) :
// la logique de lecture/expiration était dupliquée dans 3 fichiers avec 3 comportements
// différents (le wrapper client acceptait même n'importe quel sessionId passé en URL).

export const IMPERSONATION_COOKIE = 'mpro-impersonation-session'

/**
 * Le cookie survit volontairement plus longtemps que la session logique (1 h) : c'est
 * ce qui permet au middleware de DÉTECTER une impersonation expirée et de déconnecter
 * l'opérateur, au lieu de le laisser sur le compte client avec la bannière disparue.
 */
export const IMPERSONATION_COOKIE_MAX_AGE_S = 2 * 60 * 60

export interface ImpersonationCookieData {
  sessionId: string
  expiresAt: string
}

export function parseImpersonationCookie(
  raw: string | undefined
): ImpersonationCookieData | null {
  if (!raw) return null
  try {
    const data = JSON.parse(decodeURIComponent(raw)) as Partial<ImpersonationCookieData>
    if (!data.sessionId || !data.expiresAt) return null
    return { sessionId: data.sessionId, expiresAt: data.expiresAt }
  } catch {
    return null
  }
}

export function isImpersonationExpired(data: ImpersonationCookieData): boolean {
  return new Date(data.expiresAt) <= new Date()
}
