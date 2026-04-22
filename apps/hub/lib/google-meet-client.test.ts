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

  it('lève GOOGLE_MEET_AUTH_ERROR si GOOGLE_CLIENT_ID manquant', async () => {
    process.env.GOOGLE_CLIENT_ID = ''
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_MEET_REFRESH_TOKEN = 'test-refresh-token'

    const { getGoogleMeetClient } = await import('./google-meet-client')
    expect(() => getGoogleMeetClient()).toThrow('GOOGLE_MEET_AUTH_ERROR')
  })

  it('lève GOOGLE_MEET_AUTH_ERROR si GOOGLE_MEET_REFRESH_TOKEN manquant', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
    process.env.GOOGLE_MEET_REFRESH_TOKEN = ''

    const { getGoogleMeetClient } = await import('./google-meet-client')
    expect(() => getGoogleMeetClient()).toThrow('GOOGLE_MEET_AUTH_ERROR')
  })
})
