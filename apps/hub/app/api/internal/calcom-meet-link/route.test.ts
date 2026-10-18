import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockCreateGoogleMeetSpace = vi.fn()
vi.mock('../../../../lib/google-meet-client', () => ({
  createGoogleMeetSpace: () => mockCreateGoogleMeetSpace(),
}))

const SECRET = 'secret-de-test'

function request(headers: Record<string, string> = {}) {
  return new NextRequest('https://hub.test/api/internal/calcom-meet-link', {
    method: 'POST',
    headers,
  })
}

describe('POST /api/internal/calcom-meet-link', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CALCOM_MEET_LINK_SECRET = SECRET
  })

  afterEach(() => {
    delete process.env.CALCOM_MEET_LINK_SECRET
  })

  it('répond 503 et ne travaille pas quand aucun secret n’est configuré', async () => {
    delete process.env.CALCOM_MEET_LINK_SECRET

    const { POST } = await import('./route')
    const res = await POST(request({ authorization: `Bearer ${SECRET}` }))

    expect(res.status).toBe(503)
    expect(mockCreateGoogleMeetSpace).not.toHaveBeenCalled()
  })

  it('répond 401 sans en-tête Authorization', async () => {
    const { POST } = await import('./route')
    const res = await POST(request())

    expect(res.status).toBe(401)
    expect(mockCreateGoogleMeetSpace).not.toHaveBeenCalled()
  })

  it('répond 401 avec le mauvais secret', async () => {
    const { POST } = await import('./route')
    const res = await POST(request({ authorization: 'Bearer mauvais-secret' }))

    expect(res.status).toBe(401)
  })

  it('crée la salle et rend meetSpaceName/meetUri avec le bon secret', async () => {
    mockCreateGoogleMeetSpace.mockResolvedValue({
      meetSpaceName: 'spaces/abc',
      meetUri: 'https://meet.google.com/abc-defg-hij',
    })

    const { POST } = await import('./route')
    const res = await POST(request({ authorization: `Bearer ${SECRET}` }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual({
      meetSpaceName: 'spaces/abc',
      meetUri: 'https://meet.google.com/abc-defg-hij',
    })
  })

  // Un rendez-vous sans lien n'est pas un rendez-vous dégradé (leçon T-049/T-052) :
  // l'absence de meetUri doit être un échec explicite, pas un 200 creux.
  it('répond 502 si Google ne renvoie pas de meetUri', async () => {
    mockCreateGoogleMeetSpace.mockResolvedValue({ meetSpaceName: 'spaces/abc' })

    const { POST } = await import('./route')
    const res = await POST(request({ authorization: `Bearer ${SECRET}` }))

    expect(res.status).toBe(502)
  })

  it('répond 502 avec le motif explicite quand Google refuse', async () => {
    mockCreateGoogleMeetSpace.mockRejectedValue(new Error('invalid_grant'))

    const { POST } = await import('./route')
    const res = await POST(request({ authorization: `Bearer ${SECRET}` }))
    const body = await res.json()

    expect(res.status).toBe(502)
    expect(body.error).toBe('revoked')
  })
})
