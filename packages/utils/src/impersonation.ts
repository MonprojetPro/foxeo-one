// Story 13.3 — Source unique de vérité du cookie d'impersonation.
//
// Partagé par le middleware client, la route /auth/impersonation, le layout (dashboard)
// et les Server Actions des modules qui journalisent. La logique de lecture/expiration
// était dupliquée avec des comportements divergents (le wrapper client acceptait même
// n'importe quel sessionId passé en URL).
//
// Vit dans @monprojetpro/utils (et non dans apps/client) parce que les modules partagés
// doivent pouvoir marquer leurs logs comme « fait en impersonation ».

export const IMPERSONATION_COOKIE = 'mpro-impersonation-session'

/**
 * Le cookie survit volontairement plus longtemps que la session logique (1 h) : c'est
 * ce qui permet au middleware de DÉTECTER une impersonation expirée et de déconnecter
 * l'opérateur, au lieu de le laisser sur le compte client avec la bannière disparue.
 */
export const IMPERSONATION_COOKIE_MAX_AGE_S = 2 * 60 * 60

/** Action générique journalisée pour toute mutation faite pendant une impersonation. */
export const IMPERSONATION_ACTION = 'impersonation_action'

/** Événements de cycle de vie — exclus du décompte d'actions montré au client. */
export const IMPERSONATION_LIFECYCLE_ACTIONS = [
  'impersonation_started',
  'impersonation_ended',
] as const

export interface ImpersonationCookieData {
  sessionId: string
  expiresAt: string
  /** Opérateur agissant — devient `actor_id` des logs de la session. */
  operatorId: string
  /** Client emprunté — devient `entity_id` des logs de la session. */
  clientId: string
}

export function parseImpersonationCookie(
  raw: string | undefined
): ImpersonationCookieData | null {
  if (!raw) return null
  try {
    const data = JSON.parse(decodeURIComponent(raw)) as Partial<ImpersonationCookieData>
    if (!data.sessionId || !data.expiresAt || !data.operatorId || !data.clientId) {
      return null
    }
    return {
      sessionId: data.sessionId,
      expiresAt: data.expiresAt,
      operatorId: data.operatorId,
      clientId: data.clientId,
    }
  } catch {
    return null
  }
}

export function isImpersonationExpired(data: ImpersonationCookieData): boolean {
  return new Date(data.expiresAt) <= new Date()
}

/** Session d'impersonation exploitable (présente ET non expirée), sinon null. */
export function resolveImpersonation(
  raw: string | undefined
): ImpersonationCookieData | null {
  const data = parseImpersonationCookie(raw)
  if (!data || isImpersonationExpired(data)) return null
  return data
}

export interface ActivityActor {
  actor_type: 'client' | 'operator' | 'operator_impersonation'
  actor_id: string
  /** À fusionner dans le `metadata` du log pour rattacher l'action à sa session. */
  metadata: Record<string, unknown>
}

/**
 * Détermine QUI journaliser. En impersonation, l'action est attribuée à l'opérateur
 * (jamais au client, qui n'a rien fait) et porte l'id de session — sans quoi
 * l'historique support ne peut ni compter ni distinguer les actions.
 */
export function resolveActivityActor(
  impersonation: ImpersonationCookieData | null,
  fallback: { actor_type: 'client' | 'operator'; actor_id: string }
): ActivityActor {
  if (!impersonation) {
    return { ...fallback, metadata: {} }
  }
  return {
    actor_type: 'operator_impersonation',
    actor_id: impersonation.operatorId,
    metadata: { session_id: impersonation.sessionId, impersonated_client_id: impersonation.clientId },
  }
}
