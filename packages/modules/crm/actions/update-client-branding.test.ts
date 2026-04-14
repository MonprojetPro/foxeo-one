import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

const mockConfigSingle = vi.fn()
const mockConfigEq = vi.fn(() => ({ single: mockConfigSingle }))
const mockConfigSelect = vi.fn(() => ({ eq: mockConfigEq }))

const mockClientSingle = vi.fn()
const mockClientEq2 = vi.fn(() => ({ single: mockClientSingle }))
const mockClientEq1 = vi.fn(() => ({ eq: mockClientEq2 }))
const mockClientSelect = vi.fn(() => ({ eq: mockClientEq1 }))

const mockOpSingle = vi.fn()
const mockOpEq = vi.fn(() => ({ single: mockOpSingle }))
const mockOpSelect = vi.fn(() => ({ eq: mockOpEq }))

const mockGetUser = vi.fn()

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') return { select: mockOpSelect }
  if (table === 'clients') return { select: mockClientSelect }
  if (table === 'client_configs') return { select: mockConfigSelect, update: mockUpdate }
  if (table === 'activity_logs') return { insert: mockInsert }
  return { select: vi.fn() }
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

function setupAuthMocks() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null })
  mockOpSingle.mockResolvedValue({ data: { id: 'op-1' }, error: null })
  mockClientSingle.mockResolvedValue({ data: { id: 'client-1', name: 'Acme', operator_id: 'op-1' }, error: null })
  mockConfigSingle.mockResolvedValue({
    data: { id: 'cfg-1', custom_branding: { logoUrl: null, displayName: null, accentColor: null, updatedAt: '2026-01-01T00:00:00Z' } },
    error: null,
  })
}

describe('updateClientBranding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns VALIDATION_ERROR for invalid clientId', async () => {
    const { updateClientBranding } = await import('./update-client-branding')
    const result = await updateClientBranding('not-a-uuid', { displayName: 'Test' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.data).toBeNull()
  })

  it('returns VALIDATION_ERROR for invalid accent color', async () => {
    const { updateClientBranding } = await import('./update-client-branding')
    const result = await updateClientBranding('a0000000-0000-0000-0000-000000000001', { accentColor: 'red' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns VALIDATION_ERROR for displayName exceeding 50 chars', async () => {
    const { updateClientBranding } = await import('./update-client-branding')
    const result = await updateClientBranding('a0000000-0000-0000-0000-000000000001', {
      displayName: 'A'.repeat(51),
    })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns UNAUTHORIZED when no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No user' } })
    const { updateClientBranding } = await import('./update-client-branding')
    const result = await updateClientBranding('a0000000-0000-0000-0000-000000000001', { displayName: 'Test' })
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns NOT_FOUND when operator not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null })
    mockOpSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const { updateClientBranding } = await import('./update-client-branding')
    const result = await updateClientBranding('a0000000-0000-0000-0000-000000000001', { displayName: 'Test' })
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns NOT_FOUND when client not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null })
    mockOpSingle.mockResolvedValue({ data: { id: 'op-1' }, error: null })
    mockClientSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })
    const { updateClientBranding } = await import('./update-client-branding')
    const result = await updateClientBranding('a0000000-0000-0000-0000-000000000001', { displayName: 'Test' })
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('updates branding successfully with displayName and accentColor', async () => {
    setupAuthMocks()
    const { updateClientBranding } = await import('./update-client-branding')
    const result = await updateClientBranding('a0000000-0000-0000-0000-000000000001', {
      displayName: 'ACME Corp',
      accentColor: '#FF5733',
    })
    expect(result.error).toBeNull()
    expect(result.data?.displayName).toBe('ACME Corp')
    expect(result.data?.accentColor).toBe('#FF5733')
    expect(result.data?.updatedAt).toBeDefined()
  })

  it('preserves existing fields when updating partial branding', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null })
    mockOpSingle.mockResolvedValue({ data: { id: 'op-1' }, error: null })
    mockClientSingle.mockResolvedValue({ data: { id: 'client-1', name: 'Acme', operator_id: 'op-1' }, error: null })
    mockConfigSingle.mockResolvedValue({
      data: {
        id: 'cfg-1',
        custom_branding: { logoUrl: 'https://logo.png', displayName: 'Old Name', accentColor: '#F7931E', updatedAt: '2026-01-01T00:00:00Z' },
      },
      error: null,
    })
    const { updateClientBranding } = await import('./update-client-branding')
    const result = await updateClientBranding('a0000000-0000-0000-0000-000000000001', { displayName: 'New Name' })
    expect(result.data?.displayName).toBe('New Name')
    expect(result.data?.logoUrl).toBe('https://logo.png')
    expect(result.data?.accentColor).toBe('#F7931E')
  })

  it('resets branding to null values', async () => {
    setupAuthMocks()
    const { updateClientBranding } = await import('./update-client-branding')
    const result = await updateClientBranding('a0000000-0000-0000-0000-000000000001', {
      logoUrl: null,
      displayName: null,
      accentColor: null,
    })
    expect(result.data?.logoUrl).toBeNull()
    expect(result.data?.displayName).toBeNull()
    expect(result.data?.accentColor).toBeNull()
  })

  it('logs activity on successful update', async () => {
    setupAuthMocks()
    const { updateClientBranding } = await import('./update-client-branding')
    await updateClientBranding('a0000000-0000-0000-0000-000000000001', { displayName: 'ACME' })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'branding_updated',
        entity_type: 'client',
        entity_id: 'a0000000-0000-0000-0000-000000000001',
        metadata: expect.objectContaining({ displayName: 'ACME' }),
      }),
    )
  })

  it('returns DATABASE_ERROR when update fails', async () => {
    setupAuthMocks()
    mockUpdateEq.mockResolvedValueOnce({ error: { message: 'DB error' } })
    const { updateClientBranding } = await import('./update-client-branding')
    const result = await updateClientBranding('a0000000-0000-0000-0000-000000000001', { displayName: 'Test' })
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('accepts valid hex accent color', async () => {
    setupAuthMocks()
    const { updateClientBranding } = await import('./update-client-branding')
    const result = await updateClientBranding('a0000000-0000-0000-0000-000000000001', { accentColor: '#aaBBcc' })
    expect(result.error).toBeNull()
    expect(result.data?.accentColor).toBe('#aaBBcc')
  })
})
