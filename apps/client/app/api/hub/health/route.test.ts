// Story 12.7 — Tests endpoint /api/hub/health (6 tests)

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock @supabase/supabase-js avant import du module ─────────────────────────

const mockListBuckets = vi.fn()
const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    storage: { listBuckets: mockListBuckets },
  })),
}))

// ── Mock next/server ──────────────────────────────────────────────────────────

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
      _body: body,
    }),
  },
}))

// ── Import après mocks ────────────────────────────────────────────────────────

import { GET } from './route'

function makeRequest(secret: string | null = null): Request {
  const headers = new Headers()
  if (secret) headers.set('X-Hub-Secret', secret)
  return new Request('http://localhost/api/hub/health', { headers })
}

describe('/api/hub/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('INSTANCE_SECRET', 'test-secret-123')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key')

    // Default: rpc retourne une erreur pour forcer le fallback
    mockRpc.mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'rpc not found' } }) })
    mockFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ n_live_tup: 1500 }, { n_live_tup: 2500 }], error: null }),
    })
    mockListBuckets.mockResolvedValue({ data: [], error: null })
  })

  it('retourne 401 si X-Hub-Secret manquant', async () => {
    const res = await GET(makeRequest(null))
    expect(res.status).toBe(401)
    expect((res as { _body: { error: string } })._body).toMatchObject({ error: 'Unauthorized' })
  })

  it('retourne 401 si X-Hub-Secret incorrect', async () => {
    const res = await GET(makeRequest('wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('retourne 200 avec secret correct', async () => {
    const res = await GET(makeRequest('test-secret-123'))
    expect(res.status).toBe(200)
  })

  it('retourne un objet UsageMetrics avec les bonnes clés', async () => {
    const res = await GET(makeRequest('test-secret-123'))
    const body = (res as { _body: unknown })._body as Record<string, unknown>
    expect(body).toHaveProperty('dbRows')
    expect(body).toHaveProperty('storageUsedMb')
    expect(body).toHaveProperty('bandwidthUsedGb')
    expect(body).toHaveProperty('edgeFunctionCalls')
  })

  it('calcule dbRows depuis le fallback pg_stat_user_tables', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ n_live_tup: 1500 }, { n_live_tup: 2500 }], error: null }),
    })
    const res = await GET(makeRequest('test-secret-123'))
    const body = (res as { _body: { dbRows: number } })._body
    expect(body.dbRows).toBe(4000) // 1500 + 2500
  })

  it('utilise la valeur RPC si disponible', async () => {
    mockRpc.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: { total_rows: 12000 }, error: null }),
    })
    const res = await GET(makeRequest('test-secret-123'))
    const body = (res as { _body: { dbRows: number } })._body
    expect(body.dbRows).toBe(12000)
  })
})
