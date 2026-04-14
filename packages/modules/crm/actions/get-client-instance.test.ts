import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockMaybeSingle = vi.fn()
const mockFrom = vi.fn(() => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      maybeSingle: mockMaybeSingle,
    })),
  })),
}))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

describe('getClientInstance Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return null when no instance exists for client', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    const { getClientInstance } = await import('./get-client-instance')
    const result = await getClientInstance('550e8400-e29b-41d4-a716-446655440001')

    expect(result.error).toBeNull()
    expect(result.data).toBeNull()
  })

  it('should return transformed instance data when found', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'inst-123',
        client_id: '550e8400-e29b-41d4-a716-446655440001',
        instance_url: 'https://jean.monprojet-pro.com',
        slug: 'jean',
        status: 'active',
        tier: 'base',
        active_modules: ['core-dashboard', 'chat'],
        created_at: '2026-01-01T00:00:00Z',
        activated_at: '2026-01-02T00:00:00Z',
        transferred_at: null,
      },
      error: null,
    })

    const { getClientInstance } = await import('./get-client-instance')
    const result = await getClientInstance('550e8400-e29b-41d4-a716-446655440001')

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      id: 'inst-123',
      clientId: '550e8400-e29b-41d4-a716-446655440001',
      instanceUrl: 'https://jean.monprojet-pro.com',
      slug: 'jean',
      status: 'active',
      tier: 'base',
      activeModules: ['core-dashboard', 'chat'],
      createdAt: '2026-01-01T00:00:00Z',
      activatedAt: '2026-01-02T00:00:00Z',
      transferredAt: null,
    })
  })

  it('should return DATABASE_ERROR when query fails', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'Connection refused', code: 'PGRST301' },
    })

    const { getClientInstance } = await import('./get-client-instance')
    const result = await getClientInstance('550e8400-e29b-41d4-a716-446655440001')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should return transferred instance with transferredAt', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'inst-456',
        client_id: '550e8400-e29b-41d4-a716-446655440001',
        instance_url: 'https://jean.monprojet-pro.com',
        slug: 'jean',
        status: 'transferred',
        tier: 'base',
        active_modules: ['core-dashboard'],
        created_at: '2026-01-01T00:00:00Z',
        activated_at: '2026-01-02T00:00:00Z',
        transferred_at: '2026-03-01T00:00:00Z',
      },
      error: null,
    })

    const { getClientInstance } = await import('./get-client-instance')
    const result = await getClientInstance('550e8400-e29b-41d4-a716-446655440001')

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe('transferred')
    expect(result.data?.transferredAt).toBe('2026-03-01T00:00:00Z')
  })
})
