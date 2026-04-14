import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockMaybeSingle = vi.fn()
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}))

describe('getClientConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns VALIDATION_ERROR when clientId is empty', async () => {
    const { getClientConfig } = await import('./get-client-config')
    const result = await getClientConfig('')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.data).toBeNull()
  })

  it('returns DB_ERROR when supabase returns error', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error', code: 'PGRST000' },
    })
    const { getClientConfig } = await import('./get-client-config')
    const result = await getClientConfig('client-1')
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('returns NOT_FOUND when no config found', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const { getClientConfig } = await import('./get-client-config')
    const result = await getClientConfig('client-1')
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns mapped ClientConfig on success', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: 'cfg-1',
        client_id: 'client-1',
        dashboard_type: 'one',
        active_modules: ['core-dashboard', 'chat'],
        theme_variant: 'one',
        custom_branding: null,
        elio_config: null,
        elio_tier: null,
        density: 'comfortable',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      error: null,
    })
    const { getClientConfig } = await import('./get-client-config')
    const result = await getClientConfig('client-1')
    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({
      id: 'cfg-1',
      clientId: 'client-1',
      dashboardType: 'one',
      activeModules: ['core-dashboard', 'chat'],
      density: 'comfortable',
    })
  })

  it('defaults active_modules to core-dashboard when null', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: 'cfg-2',
        client_id: 'client-2',
        dashboard_type: 'one',
        active_modules: null,
        theme_variant: 'one',
        custom_branding: null,
        elio_config: null,
        elio_tier: null,
        density: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      error: null,
    })
    const { getClientConfig } = await import('./get-client-config')
    const result = await getClientConfig('client-2')
    expect(result.data?.activeModules).toEqual(['core-dashboard'])
    expect(result.data?.density).toBe('comfortable')
  })

  it('maps custom_branding correctly', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: 'cfg-3',
        client_id: 'client-3',
        dashboard_type: 'one',
        active_modules: ['core-dashboard'],
        theme_variant: 'one',
        custom_branding: { logoUrl: 'https://logo.png', displayName: 'ACME', accentColor: null, updatedAt: '2026-01-01T00:00:00Z' },
        elio_config: null,
        elio_tier: null,
        density: 'comfortable',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      error: null,
    })
    const { getClientConfig } = await import('./get-client-config')
    const result = await getClientConfig('client-3')
    expect(result.data?.customBranding?.logoUrl).toBe('https://logo.png')
    expect(result.data?.customBranding?.displayName).toBe('ACME')
  })
})
