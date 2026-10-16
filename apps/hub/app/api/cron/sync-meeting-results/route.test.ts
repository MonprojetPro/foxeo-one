import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Ce qui est vérifié ici : la PORTE (jamais ouverte sans secret), le CHOIX des
 * visios à relancer, et l'écriture de l'abandon. La mécanique Google est
 * testée dans `packages/modules/visio/lib/meeting-results-sync.test.ts`.
 */

const mockSyncCore = vi.fn()
const mockUpdateEq = vi.fn(async () => ({ error: null }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
let selectResult: { data: unknown; error: { message: string } | null } = { data: [], error: null }

const query = {
  select: () => query,
  eq: () => query,
  neq: () => query,
  not: () => query,
  gte: () => query,
  lte: () => query,
  order: () => query,
  limit: async () => selectResult,
  update: mockUpdate,
}

vi.mock('@monprojetpro/supabase', () => ({
  createServiceRoleSupabaseClient: () => ({ from: () => query }),
}))

vi.mock('@monprojetpro/module-visio', async () => {
  const actual = await vi.importActual<typeof import('@monprojetpro/module-visio')>(
    '@monprojetpro/module-visio'
  )
  return { ...actual, syncMeetingResultsCore: mockSyncCore }
})

const SECRET = 'secret-de-test'

function request(headers: Record<string, string> = {}) {
  return new NextRequest('https://hub.test/api/cron/sync-meeting-results', {
    method: 'POST',
    headers,
  })
}

function meeting(overrides: Record<string, unknown> = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    title: 'Point',
    // Statut REEL d'une visio qui vient d'avoir lieu : « Planifiee ».
    // Raccrocher chez Google n'ecrit rien chez nous.
    status: 'scheduled',
    scheduled_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    ended_at: null,
    meet_space_name: 'spaces/abc',
    metadata: {},
    ...overrides,
  }
}

describe('POST /api/cron/sync-meeting-results', () => {
  // Le module est chargé UNE fois : le premier `import()` d'une route Next
  // tire tout son graphe de dépendances et dépasse à lui seul le délai par
  // défaut de Vitest — le test échouait alors pour une raison qui n'avait
  // rien à voir avec ce qu'il vérifie.
  let POST: (req: NextRequest) => Promise<Response>

  beforeAll(async () => {
    POST = (await import('./route')).POST
  })

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = SECRET
    selectResult = { data: [], error: null }
    mockSyncCore.mockResolvedValue({
      synced: true,
      transcriptReady: true,
      archived: true,
      documentId: 'doc-1',
      reason: 'ok',
    })
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
  })

  it('répond 503 et ne travaille pas quand aucun secret n’est configuré', async () => {
    delete process.env.CRON_SECRET
    const res = await POST(request({ authorization: `Bearer ${SECRET}` }))

    expect(res.status).toBe(503)
    expect(mockSyncCore).not.toHaveBeenCalled()
  })

  it('refuse un appel sans le bon secret', async () => {
    const res = await POST(request({ authorization: 'Bearer mauvais' }))

    expect(res.status).toBe(401)
    expect(mockSyncCore).not.toHaveBeenCalled()
  })

  it('refuse un appel sans en-tête d’autorisation', async () => {
    expect((await POST(request())).status).toBe(401)
  })

  it('relance les visios récentes dont le compte rendu manque', async () => {
    selectResult = { data: [meeting()], error: null }

    const res = await POST(request({ authorization: `Bearer ${SECRET}` }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({ processed: 1, archived: 1 })
    expect(mockSyncCore).toHaveBeenCalledTimes(1)
  })

  it('relance une visio encore « Planifiée » — c’est le cas normal après un raccroché', async () => {
    // Verrou du defaut du 16-10 : le filtre `status = 'completed'` excluait
    // exactement les visios a rattraper.
    selectResult = { data: [meeting({ status: 'scheduled' })], error: null }

    const body = await (await POST(request({ authorization: `Bearer ${SECRET}` }))).json()

    expect(body.processed).toBe(1)
  })

  it('ne relance PAS une visio dont le compte rendu est déjà déposé', async () => {
    selectResult = { data: [meeting({ metadata: { transcript_sync: { done: true } } })], error: null }

    const body = await (await POST(request({ authorization: `Bearer ${SECRET}` }))).json()

    expect(body.processed).toBe(0)
    expect(mockSyncCore).not.toHaveBeenCalled()
  })

  it('ÉCRIT l’abandon au-delà de 24 h au lieu de s’arrêter en silence', async () => {
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    selectResult = { data: [meeting({ scheduled_at: old })], error: null }

    const body = await (await POST(request({ authorization: `Bearer ${SECRET}` }))).json()

    expect(body).toMatchObject({ gaveUp: 1, processed: 0 })
    const payload = mockUpdate.mock.calls[0]?.[0] as {
      metadata: { transcript_sync: { gaveUpAt: string } }
    }
    expect(payload.metadata.transcript_sync.gaveUpAt).toEqual(expect.any(String))
    expect(mockSyncCore).not.toHaveBeenCalled()
  })

  it('n’enregistre pas deux fois le même abandon', async () => {
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    selectResult = {
      data: [meeting({ scheduled_at: old, metadata: { transcript_sync: { gaveUpAt: old } } })],
      error: null,
    }

    const body = await (await POST(request({ authorization: `Bearer ${SECRET}` }))).json()

    expect(body.gaveUp).toBe(0)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('une visio en échec n’empêche pas les suivantes d’être traitées', async () => {
    selectResult = {
      data: [
        meeting({ id: '00000000-0000-0000-0000-00000000000a' }),
        meeting({ id: '00000000-0000-0000-0000-00000000000b' }),
      ],
      error: null,
    }
    mockSyncCore.mockRejectedValueOnce(new Error('Google indisponible'))

    const body = await (await POST(request({ authorization: `Bearer ${SECRET}` }))).json()

    expect(body.processed).toBe(2)
    expect(body.results[0]).toMatchObject({ reason: 'exception' })
    expect(body.results[1]).toMatchObject({ reason: 'ok' })
  })

  it('remonte une erreur de lecture au lieu de prétendre avoir fini', async () => {
    selectResult = { data: null, error: { message: 'timeout' } }

    const res = await POST(request({ authorization: `Bearer ${SECRET}` }))

    expect(res.status).toBe(500)
  })
})
