import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  useSessionCookies,
  stripCookiePersistence,
  applySessionCookiePolicy,
  serializeBrowserCookie,
  parseBrowserCookies,
} from './session-cookies'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('useSessionCookies', () => {
  it('est desactive par defaut — les espaces clients gardent des sessions longues', () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_SESSION_COOKIES', '')
    expect(useSessionCookies()).toBe(false)
  })

  it("n'accepte que la chaine 'true', pas une valeur vaguement vraie", () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_SESSION_COOKIES', '1')
    expect(useSessionCookies()).toBe(false)
    vi.stubEnv('NEXT_PUBLIC_AUTH_SESSION_COOKIES', 'true')
    expect(useSessionCookies()).toBe(true)
  })
})

describe('stripCookiePersistence', () => {
  it('retire maxAge et expires', () => {
    const result = stripCookiePersistence({
      maxAge: 34560000,
      expires: new Date('2027-01-01'),
      path: '/',
      httpOnly: true,
    })
    expect(result).not.toHaveProperty('maxAge')
    expect(result).not.toHaveProperty('expires')
    expect(result).toMatchObject({ path: '/', httpOnly: true })
  })

  it('preserve maxAge:0 — c est une suppression, pas une duree de vie', () => {
    // Confondre les deux empêcherait la déconnexion de nettoyer quoi que ce soit :
    // le cookie serait réécrit sans expiration au lieu d'être supprimé.
    const result = stripCookiePersistence({ maxAge: 0, path: '/' })
    expect(result).toMatchObject({ maxAge: 0 })
  })

  it('supporte des options absentes', () => {
    expect(stripCookiePersistence(undefined)).toBeUndefined()
  })
})

describe('applySessionCookiePolicy', () => {
  const batch = [
    { name: 'sb-access-token', value: 'a', options: { maxAge: 34560000, path: '/' } },
    { name: 'sb-refresh-token', value: 'b', options: { maxAge: 34560000, path: '/' } },
  ]

  it('ne touche a rien quand le mode est inactif', () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_SESSION_COOKIES', '')
    expect(applySessionCookiePolicy(batch)).toBe(batch)
  })

  it('retire la persistance de toute la fournee quand le mode est actif', () => {
    vi.stubEnv('NEXT_PUBLIC_AUTH_SESSION_COOKIES', 'true')
    const result = applySessionCookiePolicy(batch)
    expect(result.every((c) => !('maxAge' in (c.options ?? {})))).toBe(true)
    expect(result.map((c) => c.name)).toEqual(['sb-access-token', 'sb-refresh-token'])
  })
})

describe('serializeBrowserCookie', () => {
  it('ne pose ni Max-Age ni Expires — c est tout l objet du cookie de session', () => {
    const cookie = serializeBrowserCookie('sb-token', 'abc', { maxAge: 34560000 }, true)
    expect(cookie).not.toContain('Max-Age')
    expect(cookie).not.toContain('Expires')
  })

  it('conserve Max-Age=0 pour une suppression', () => {
    const cookie = serializeBrowserCookie('sb-token', '', { maxAge: 0 }, true)
    expect(cookie).toContain('Max-Age=0')
  })

  it('pose Secure en https et pas en http', () => {
    expect(serializeBrowserCookie('n', 'v', {}, true)).toContain('Secure')
    expect(serializeBrowserCookie('n', 'v', {}, false)).not.toContain('Secure')
  })

  it('applique des valeurs par defaut sures', () => {
    const cookie = serializeBrowserCookie('n', 'v', undefined, true)
    expect(cookie).toContain('Path=/')
    expect(cookie).toContain('SameSite=Lax')
  })

  it('encode les valeurs — un jeton contient des caracteres a echapper', () => {
    const cookie = serializeBrowserCookie('sb-token', 'a b;c', {}, true)
    expect(cookie).toContain('sb-token=a%20b%3Bc')
  })
})

describe('parseBrowserCookies', () => {
  it('decoupe et decode', () => {
    expect(parseBrowserCookies('a=1; sb-token=a%20b')).toEqual([
      { name: 'a', value: '1' },
      { name: 'sb-token', value: 'a b' },
    ])
  })

  it('rend une liste vide sur une chaine vide', () => {
    expect(parseBrowserCookies('')).toEqual([])
  })

  it('ne se laisse pas desynchroniser par une valeur contenant un =', () => {
    // Les jetons base64 finissent souvent par '=' : découper sur le PREMIER '='
    // seulement, sinon la valeur est tronquée et la session illisible.
    expect(parseBrowserCookies('sb-token=eyJhbGc=')).toEqual([
      { name: 'sb-token', value: 'eyJhbGc=' },
    ])
  })
})
