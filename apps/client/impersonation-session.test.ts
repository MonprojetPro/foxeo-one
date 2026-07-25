import { describe, it, expect } from 'vitest'
import {
  IMPERSONATION_COOKIE,
  IMPERSONATION_COOKIE_MAX_AGE_S,
  isImpersonationExpired,
  parseImpersonationCookie,
} from './impersonation-session'

const future = () => new Date(Date.now() + 60 * 60 * 1000).toISOString()
const past = () => new Date(Date.now() - 60 * 1000).toISOString()

describe('parseImpersonationCookie', () => {
  it('parses an encoded cookie', () => {
    const raw = encodeURIComponent(
      JSON.stringify({ sessionId: 'abc', expiresAt: future() })
    )
    expect(parseImpersonationCookie(raw)?.sessionId).toBe('abc')
  })

  it('returns null on missing, malformed or incomplete cookies', () => {
    expect(parseImpersonationCookie(undefined)).toBeNull()
    expect(parseImpersonationCookie('not-json')).toBeNull()
    expect(parseImpersonationCookie(JSON.stringify({ sessionId: 'abc' }))).toBeNull()
    expect(parseImpersonationCookie(JSON.stringify({ expiresAt: future() }))).toBeNull()
  })
})

describe('isImpersonationExpired', () => {
  it('detects an expired session', () => {
    expect(isImpersonationExpired({ sessionId: 'abc', expiresAt: past() })).toBe(true)
  })

  it('accepts a live session', () => {
    expect(isImpersonationExpired({ sessionId: 'abc', expiresAt: future() })).toBe(false)
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
