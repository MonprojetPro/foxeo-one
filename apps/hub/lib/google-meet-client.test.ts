import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('googleapis', () => {
  const mockMeet = { version: 'v2' }
  const mockCalendar = { version: 'v3' }
  const mockAuth = {
    OAuth2: vi.fn().mockImplementation(() => ({
      setCredentials: vi.fn(),
    })),
  }
  return {
    google: {
      auth: mockAuth,
      meet: vi.fn(() => mockMeet),
      calendar: vi.fn(() => mockCalendar),
    },
  }
})

describe('google-meet-client', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('retourne le client meet quand les variables sont présentes', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_MEET_REFRESH_TOKEN = 'test-refresh-token'

    const { getGoogleMeetClient } = await import('./google-meet-client')
    const client = getGoogleMeetClient()
    expect(client).toBeDefined()
  })

  it('retourne le client calendar quand les variables sont présentes', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_MEET_REFRESH_TOKEN = 'test-refresh-token'

    const { getGoogleCalendarClient } = await import('./google-meet-client')
    const client = getGoogleCalendarClient()
    expect(client).toBeDefined()
  })

  // T-052 : l'erreur NOMME désormais la variable absente. « Il manque quelque
  // chose » envoyait chercher dans trois directions à la fois.
  it('nomme la variable manquante quand GOOGLE_CLIENT_ID est absent', async () => {
    process.env.GOOGLE_CLIENT_ID = ''
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_MEET_REFRESH_TOKEN = 'test-refresh-token'

    const { getGoogleMeetClient } = await import('./google-meet-client')
    expect(() => getGoogleMeetClient()).toThrow('GOOGLE_MEET_CONFIG_MISSING: GOOGLE_CLIENT_ID')
  })

  it('nomme la variable manquante quand GOOGLE_MEET_REFRESH_TOKEN est absent', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_MEET_REFRESH_TOKEN = ''

    const { getGoogleMeetClient } = await import('./google-meet-client')
    expect(() => getGoogleMeetClient()).toThrow(
      'GOOGLE_MEET_CONFIG_MISSING: GOOGLE_MEET_REFRESH_TOKEN'
    )
  })

  it('porte le nom et la liste exploitables par la sonde, sans jamais exposer de valeur', async () => {
    process.env.GOOGLE_CLIENT_ID = ''
    process.env.GOOGLE_CLIENT_SECRET = ''
    process.env.GOOGLE_MEET_REFRESH_TOKEN = 'valeur-secrete-a-ne-jamais-afficher'

    const { getGoogleMeetClient } = await import('./google-meet-client')
    try {
      getGoogleMeetClient()
      throw new Error('aurait dû lever')
    } catch (err) {
      const e = err as { name: string; missing: string[]; message: string }
      expect(e.name).toBe('GoogleMeetConfigError')
      expect(e.missing).toEqual(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'])
      expect(e.message).not.toContain('valeur-secrete')
    }
  })
})
