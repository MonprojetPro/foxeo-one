import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockSpacesCreate = vi.fn()
vi.mock('googleapis', () => {
  const mockMeet = { version: 'v2', spaces: { create: mockSpacesCreate } }
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

  // T-049 : createGoogleMeetSpace est le coeur partage par createHubMeeting,
  // sendMeetLink ET la route interne appelee par le webhook Cal.com.
  describe('createGoogleMeetSpace — brique partagee', () => {
    beforeEach(() => {
      process.env.GOOGLE_CLIENT_ID = 'test-client-id'
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
      process.env.GOOGLE_MEET_REFRESH_TOKEN = 'test-refresh-token'
    })

    it('mappe spaceRes.data vers meetSpaceName/meetUri', async () => {
      mockSpacesCreate.mockResolvedValue({
        data: { name: 'spaces/abc', meetingUri: 'https://meet.google.com/abc-defg-hij' },
      })

      const { createGoogleMeetSpace } = await import('./google-meet-client')
      const result = await createGoogleMeetSpace()

      expect(result).toEqual({
        meetSpaceName: 'spaces/abc',
        meetUri: 'https://meet.google.com/abc-defg-hij',
      })
    })

    it('laisse meetUri undefined si Google ne le renvoie pas', async () => {
      mockSpacesCreate.mockResolvedValue({ data: { name: 'spaces/abc' } })

      const { createGoogleMeetSpace } = await import('./google-meet-client')
      const result = await createGoogleMeetSpace()

      expect(result.meetUri).toBeUndefined()
    })

    it('laisse l\'erreur Google remonter telle quelle (pas de catch)', async () => {
      mockSpacesCreate.mockRejectedValue(new Error('invalid_grant'))

      const { createGoogleMeetSpace } = await import('./google-meet-client')
      await expect(createGoogleMeetSpace()).rejects.toThrow('invalid_grant')
    })
  })
})
