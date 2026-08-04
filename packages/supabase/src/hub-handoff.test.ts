import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildHubHandoffLink, HUB_HANDOFF_CALLBACK_PATH } from './hub-handoff'

const HUB = 'https://hub.monprojet-pro.com'

function fakeAdmin(generateLink: ReturnType<typeof vi.fn>): SupabaseClient {
  return { auth: { admin: { generateLink } } } as unknown as SupabaseClient
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_HUB_URL', HUB)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('buildHubHandoffLink', () => {
  it('construit une URL de bascule vers le callback du Hub avec le jeton', async () => {
    const generateLink = vi.fn().mockResolvedValue({
      data: { properties: { hashed_token: 'abc123' } },
      error: null,
    })

    const result = await buildHubHandoffLink({
      email: 'contact@monprojet-pro.com',
      adminClient: fakeAdmin(generateLink),
    })

    expect(result.error).toBeUndefined()
    const url = new URL(result.url!)
    expect(url.origin).toBe(HUB)
    expect(url.pathname).toBe(HUB_HANDOFF_CALLBACK_PATH)
    expect(url.searchParams.get('token_hash')).toBe('abc123')
  })

  it('demande un magiclink pour le bon compte, redirigé vers le Hub', async () => {
    const generateLink = vi.fn().mockResolvedValue({
      data: { properties: { hashed_token: 'tok' } },
      error: null,
    })

    await buildHubHandoffLink({
      email: 'contact@monprojet-pro.com',
      adminClient: fakeAdmin(generateLink),
    })

    expect(generateLink).toHaveBeenCalledWith({
      type: 'magiclink',
      email: 'contact@monprojet-pro.com',
      options: { redirectTo: `${HUB}${HUB_HANDOFF_CALLBACK_PATH}` },
    })
  })

  it('suit la bascule de domaine sans changement de code', async () => {
    vi.stubEnv('NEXT_PUBLIC_HUB_URL', 'https://monprojetpro-hub.vercel.app')
    const generateLink = vi.fn().mockResolvedValue({
      data: { properties: { hashed_token: 'tok' } },
      error: null,
    })

    const result = await buildHubHandoffLink({
      email: 'contact@monprojet-pro.com',
      adminClient: fakeAdmin(generateLink),
    })

    expect(result.url).toContain('https://monprojetpro-hub.vercel.app')
  })

  it('remonte une erreur quand generateLink echoue', async () => {
    const generateLink = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'user not found' },
    })

    const result = await buildHubHandoffLink({
      email: 'inconnu@monprojet-pro.com',
      adminClient: fakeAdmin(generateLink),
    })

    expect(result.url).toBeUndefined()
    expect(result.error).toBe('user not found')
  })

  it('remonte une erreur quand le jeton revient vide', async () => {
    // Cas vicieux : l'appel « réussit » mais sans jeton. Sans ce garde-fou on
    // construirait une URL de bascule sans token_hash, et l'opérateur atterrirait
    // sur un login muet.
    const generateLink = vi.fn().mockResolvedValue({
      data: { properties: {} },
      error: null,
    })

    const result = await buildHubHandoffLink({
      email: 'contact@monprojet-pro.com',
      adminClient: fakeAdmin(generateLink),
    })

    expect(result.url).toBeUndefined()
    expect(result.error).toContain('hashed_token')
  })

  it('echoue proprement sans cle service-role, sans jamais lancer', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')

    const result = await buildHubHandoffLink({ email: 'contact@monprojet-pro.com' })

    expect(result.url).toBeUndefined()
    expect(result.error).toContain('SUPABASE_SERVICE_ROLE_KEY')
  })
})
