import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getOverviewStats,
  getModuleUsageStats,
  getElioStats,
  getEngagementStats,
  getMrrStats,
} from './get-analytics'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'

const mockGetUser = vi.fn()
const mockRpc = vi.fn()

function makeSupabaseMock(overrides: Record<string, unknown> = {}) {
  const fromMock = vi.fn()
  const chainBase = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    ...overrides,
  }
  fromMock.mockReturnValue(chainBase)
  return {
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
    from: fromMock,
    _chain: chainBase,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getOverviewStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne UNAUTHORIZED si non authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('not auth') })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabaseMock() as never)

    const result = await getOverviewStats('30d')
    expect(result.error?.code).toBe('UNAUTHORIZED')
    expect(result.data).toBeNull()
  })

  it('retourne FORBIDDEN si non opérateur', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid' } }, error: null })
    mockRpc.mockResolvedValue({ data: false, error: null })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabaseMock() as never)

    const result = await getOverviewStats('30d')
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('retourne les stats d\'overview avec période 7d', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid' } }, error: null })
    mockRpc.mockResolvedValue({ data: true, error: null })

    const supabaseMock = makeSupabaseMock()
    // client_configs query -> Lab clients + One clients
    supabaseMock._chain.limit.mockResolvedValue({
      data: [
        { dashboard_type: 'lab', is_active: true },
        { dashboard_type: 'lab', is_active: true },
        { dashboard_type: 'one', is_active: true },
      ],
      error: null,
    })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabaseMock as never)

    const result = await getOverviewStats('7d')
    expect(result.error).toBeNull()
    expect(result.data).toBeDefined()
    expect(result.data?.totalClients).toBeGreaterThanOrEqual(0)
  })
})

describe('getModuleUsageStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne UNAUTHORIZED si non authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabaseMock() as never)

    const result = await getModuleUsageStats('30d')
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('groupe les logs par entity_type et retourne le classement', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid' } }, error: null })
    mockRpc.mockResolvedValue({ data: true, error: null })

    const supabaseMock = makeSupabaseMock()
    supabaseMock._chain.limit.mockResolvedValue({
      data: [
        { entity_type: 'elio' },
        { entity_type: 'elio' },
        { entity_type: 'document' },
        { entity_type: 'parcours' },
        { entity_type: 'elio' },
      ],
      error: null,
    })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabaseMock as never)

    const result = await getModuleUsageStats('30d')
    expect(result.error).toBeNull()
    expect(result.data).toBeDefined()
    // elio should be first (count 3)
    expect(result.data?.[0]?.entityType).toBe('elio')
    expect(result.data?.[0]?.count).toBe(3)
  })
})

describe('getElioStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne UNAUTHORIZED si non authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabaseMock() as never)

    const result = await getElioStats('30d')
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('filtre les logs actor_type=elio et calcule les stats', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid' } }, error: null })
    mockRpc.mockResolvedValue({ data: true, error: null })

    const supabaseMock = makeSupabaseMock()
    supabaseMock._chain.limit.mockResolvedValue({
      data: [
        { action: 'message_sent', metadata: { feedback: 'positive' }, created_at: '2026-03-07T10:00:00Z' },
        { action: 'message_sent', metadata: { feedback: 'negative' }, created_at: '2026-03-07T11:00:00Z' },
        { action: 'message_sent', metadata: null, created_at: '2026-03-08T09:00:00Z' },
      ],
      error: null,
    })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabaseMock as never)

    const result = await getElioStats('7d')
    expect(result.error).toBeNull()
    expect(result.data?.totalConversations).toBe(3)
    expect(result.data?.positiveFeedback).toBe(1)
    expect(result.data?.negativeFeedback).toBe(1)
  })
})

describe('getEngagementStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne UNAUTHORIZED si non authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabaseMock() as never)

    const result = await getEngagementStats('30d')
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('retourne les clients les plus actifs et inactifs', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid' } }, error: null })
    mockRpc.mockResolvedValue({ data: true, error: null })

    const supabaseMock = makeSupabaseMock()
    // First call: active logs
    supabaseMock._chain.limit.mockResolvedValue({
      data: [
        { actor_id: 'c1', actor_type: 'client' },
        { actor_id: 'c1', actor_type: 'client' },
        { actor_id: 'c2', actor_type: 'client' },
      ],
      error: null,
    })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabaseMock as never)

    const result = await getEngagementStats('30d')
    expect(result.error).toBeNull()
    expect(result.data?.mostActiveClients).toBeDefined()
    expect(result.data?.mostActiveClients[0]?.actorId).toBe('c1')
    expect(result.data?.mostActiveClients[0]?.count).toBe(2)
  })
})

describe('getMrrStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne UNAUTHORIZED si non authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabaseMock() as never)

    const result = await getMrrStats()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('retourne le MRR total depuis billing_sync', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid' } }, error: null })
    mockRpc.mockResolvedValue({ data: true, error: null })

    const supabaseMock = makeSupabaseMock()
    supabaseMock._chain.limit.mockResolvedValue({
      data: [
        { entity_type: 'subscription', data: { amount_cents: 19900, billing_period: 'monthly', status: 'active' } },
        { entity_type: 'subscription', data: { amount_cents: 49900, billing_period: 'yearly', status: 'active' } },
      ],
      error: null,
    })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabaseMock as never)

    const result = await getMrrStats()
    expect(result.error).toBeNull()
    expect(result.data?.mrr).toBeGreaterThan(0)
    expect(result.data?.activeSubscriptions).toBe(2)
  })

  it('retourne MRR=0 si pas de données billing_sync', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid' } }, error: null })
    mockRpc.mockResolvedValue({ data: true, error: null })

    const supabaseMock = makeSupabaseMock()
    supabaseMock._chain.limit.mockResolvedValue({ data: [], error: null })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabaseMock as never)

    const result = await getMrrStats()
    expect(result.data?.mrr).toBe(0)
    expect(result.data?.activeSubscriptions).toBe(0)
  })
})
