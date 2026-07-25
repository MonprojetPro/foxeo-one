import { describe, it, expect } from 'vitest'
import {
  IMPERSONATION_COOKIE,
  IMPERSONATION_COOKIE_MAX_AGE_S,
  isImpersonationExpired,
  parseImpersonationCookie,
  resolveImpersonation,
  resolveActivityActor,
  type ImpersonationCookieData,
} from './impersonation'

const future = () => new Date(Date.now() + 60 * 60 * 1000).toISOString()
const past = () => new Date(Date.now() - 60 * 1000).toISOString()

function cookie(overrides: Partial<ImpersonationCookieData> = {}): string {
  return encodeURIComponent(
    JSON.stringify({
      sessionId: 'session-1',
      expiresAt: future(),
      operatorId: 'operator-1',
      clientId: 'client-1',
      ...overrides,
    })
  )
}

describe('parseImpersonationCookie', () => {
  it('parses an encoded cookie', () => {
    const data = parseImpersonationCookie(cookie())
    expect(data).toEqual({
      sessionId: 'session-1',
      expiresAt: expect.any(String),
      operatorId: 'operator-1',
      clientId: 'client-1',
    })
  })

  it('returns null on missing or malformed cookies', () => {
    expect(parseImpersonationCookie(undefined)).toBeNull()
    expect(parseImpersonationCookie('not-json')).toBeNull()
  })

  // Sans operatorId/clientId, le middleware ne peut pas journaliser l'action :
  // un cookie incomplet doit être traité comme absent, pas comme valide.
  it('rejects a cookie missing the logging identifiers', () => {
    expect(
      parseImpersonationCookie(
        JSON.stringify({ sessionId: 'session-1', expiresAt: future() })
      )
    ).toBeNull()
  })
})

describe('isImpersonationExpired / resolveImpersonation', () => {
  it('detects an expired session', () => {
    const data = parseImpersonationCookie(cookie({ expiresAt: past() }))!
    expect(isImpersonationExpired(data)).toBe(true)
    expect(resolveImpersonation(cookie({ expiresAt: past() }))).toBeNull()
  })

  it('accepts a live session', () => {
    expect(resolveImpersonation(cookie())?.sessionId).toBe('session-1')
  })
})

describe('resolveActivityActor', () => {
  it('keeps the nominal actor outside impersonation', () => {
    const actor = resolveActivityActor(null, { actor_type: 'client', actor_id: 'client-1' })
    expect(actor).toEqual({
      actor_type: 'client',
      actor_id: 'client-1',
      metadata: {},
    })
  })

  // Le cœur du correctif : une action faite en impersonation ne doit JAMAIS être
  // attribuée au client, sinon l'historique support ne la distingue pas.
  it('attributes the action to the operator during impersonation', () => {
    const impersonation = parseImpersonationCookie(cookie())!
    const actor = resolveActivityActor(impersonation, {
      actor_type: 'client',
      actor_id: 'client-1',
    })

    expect(actor.actor_type).toBe('operator_impersonation')
    expect(actor.actor_id).toBe('operator-1')
    expect(actor.metadata).toEqual({
      session_id: 'session-1',
      impersonated_client_id: 'client-1',
    })
  })
})

describe('cookie contract', () => {
  it('keeps the shared cookie name', () => {
    expect(IMPERSONATION_COOKIE).toBe('mpro-impersonation-session')
  })

  // Le cookie doit SURVIVRE à l'expiration logique (1 h) : c'est ce qui permet au
  // middleware de détecter la session périmée et de déconnecter l'opérateur.
  it('outlives the 1h logical session', () => {
    expect(IMPERSONATION_COOKIE_MAX_AGE_S).toBeGreaterThan(60 * 60)
  })
})
