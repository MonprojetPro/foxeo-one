import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase client
const mockMaybeSingle = vi.fn()
const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: mockMaybeSingle })) }))
const mockInsertSelect = vi.fn(() => ({ single: mockSingle }))
const mockInsert = vi.fn(() => ({ select: mockInsertSelect }))

const makeSupabaseMock = () => ({
  from: vi.fn((table: string) => {
    if (table === 'client_instances') {
      return {
        select: mockSelect,
        insert: mockInsert,
      }
    }
    return {}
  }),
})

describe('provisionOneInstance (MVP stub)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate slug from company name and create instance', async () => {
    // Slug not taken
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockSingle.mockResolvedValue({
      data: { id: '550e8400-e29b-41d4-a716-446655440001' },
      error: null,
    })

    const supabase = makeSupabaseMock()
    const { provisionOneInstance } = await import('./provision-instance')

    const result = await provisionOneInstance(supabase as never, {
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      companyName: 'Acme Corp',
      tier: 'essentiel',
      modules: ['core-dashboard', 'chat'],
    })

    expect(result.error).toBeNull()
    expect(result.data).toBeTruthy()
    expect(result.data?.slug).toBe('acme-corp')
    expect(result.data?.instanceUrl).toBe('https://acme-corp.foxeo.io')
    expect(result.data?.status).toBe('active')
  })

  it('should strip accents from company name for slug', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockSingle.mockResolvedValue({
      data: { id: '550e8400-e29b-41d4-a716-446655440002' },
      error: null,
    })

    const supabase = makeSupabaseMock()
    const { provisionOneInstance } = await import('./provision-instance')

    const result = await provisionOneInstance(supabase as never, {
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      companyName: 'Étoile Créative',
      tier: 'agentique',
      modules: ['core-dashboard'],
    })

    expect(result.error).toBeNull()
    expect(result.data?.slug).toBe('etoile-creative')
  })

  it('should append suffix when slug is already taken', async () => {
    // First call (base slug) → taken, second call (-2) → free
    mockMaybeSingle
      .mockResolvedValueOnce({ data: { slug: 'acme' }, error: null })
      .mockResolvedValueOnce({ data: null, error: null })

    mockSingle.mockResolvedValue({
      data: { id: '550e8400-e29b-41d4-a716-446655440003' },
      error: null,
    })

    const supabase = makeSupabaseMock()
    const { provisionOneInstance } = await import('./provision-instance')

    const result = await provisionOneInstance(supabase as never, {
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      companyName: 'Acme',
      tier: 'base',
      modules: ['core-dashboard'],
    })

    expect(result.error).toBeNull()
    expect(result.data?.slug).toBe('acme-2')
  })

  it('should return PROVISION_ERROR when insert fails', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'DB error', code: '500' },
    })

    const supabase = makeSupabaseMock()
    const { provisionOneInstance } = await import('./provision-instance')

    const result = await provisionOneInstance(supabase as never, {
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      companyName: 'Test Co',
      tier: 'essentiel',
      modules: ['core-dashboard'],
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('PROVISION_ERROR')
  })

  it('should insert with correct tier and active_modules', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockSingle.mockResolvedValue({
      data: { id: '550e8400-e29b-41d4-a716-446655440004' },
      error: null,
    })

    const supabase = makeSupabaseMock()
    const { provisionOneInstance } = await import('./provision-instance')

    await provisionOneInstance(supabase as never, {
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      companyName: 'Ma Boite',
      tier: 'agentique',
      modules: ['core-dashboard', 'documents', 'chat'],
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: 'agentique',
        active_modules: ['core-dashboard', 'documents', 'chat'],
        status: 'active',
      })
    )
  })
})
