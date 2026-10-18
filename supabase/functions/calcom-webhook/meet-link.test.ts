import { describe, it, expect, vi } from 'vitest'
import { requestMeetLink } from './meet-link'

function fakeFetch(impl: (url: string, init?: RequestInit) => Promise<Response> | Response) {
  return vi.fn(impl) as unknown as typeof fetch
}

describe('requestMeetLink — T-049, jamais bloquant', () => {
  it('rend {} sans appeler fetch quand le secret est absent', async () => {
    const fetchImpl = fakeFetch(() => {
      throw new Error('ne devrait jamais être appelé')
    })

    const result = await requestMeetLink({ secret: undefined, hubUrl: 'https://hub.test', fetchImpl })

    expect(result).toEqual({})
  })

  it('rend meetSpaceName/meetUri quand le Hub répond 200', async () => {
    const fetchImpl = fakeFetch(() =>
      new Response(
        JSON.stringify({ data: { meetSpaceName: 'spaces/abc', meetUri: 'https://meet.google.com/abc-defg-hij' } }),
        { status: 200 }
      )
    )

    const result = await requestMeetLink({ secret: 's3cr3t', hubUrl: 'https://hub.test', fetchImpl })

    expect(result).toEqual({ meetSpaceName: 'spaces/abc', meetUri: 'https://meet.google.com/abc-defg-hij' })
  })

  it('appelle la bonne URL avec le bon en-tête Authorization', async () => {
    const fetchImpl = fakeFetch(() => new Response(JSON.stringify({ data: {} }), { status: 200 }))

    await requestMeetLink({ secret: 's3cr3t', hubUrl: 'https://hub.test', fetchImpl })

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://hub.test/api/internal/calcom-meet-link',
      expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer s3cr3t' } })
    )
  })

  // ⛔ JAMAIS BLOQUANT : les 3 cas d'échec rendent {} au lieu de lever, pour
  // que le meeting Cal.com soit créé quand même (sans lien), exactement comme
  // avant T-049 — on ajoute le lien, on ne retire pas la garantie de création.
  it('rend {} (et ne lève pas) quand le Hub répond en erreur HTTP', async () => {
    const fetchImpl = fakeFetch(() => new Response('config manquante', { status: 503 }))

    const result = await requestMeetLink({ secret: 's3cr3t', hubUrl: 'https://hub.test', fetchImpl })

    expect(result).toEqual({})
  })

  it('rend {} (et ne lève pas) quand fetch échoue (réseau)', async () => {
    const fetchImpl = fakeFetch(() => {
      throw new Error('network down')
    })

    const result = await requestMeetLink({ secret: 's3cr3t', hubUrl: 'https://hub.test', fetchImpl })

    expect(result).toEqual({})
  })

  it('rend {} (et ne lève pas) quand la réponse n\'est pas du JSON valide', async () => {
    const fetchImpl = fakeFetch(() => new Response('<html>pas du json</html>', { status: 200 }))

    const result = await requestMeetLink({ secret: 's3cr3t', hubUrl: 'https://hub.test', fetchImpl })

    expect(result).toEqual({})
  })
})
