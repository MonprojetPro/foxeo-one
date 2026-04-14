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

describe('getClientBranding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns VALIDATION_ERROR when clientId is empty', async () => {
    const { getClientBranding } = await import('./get-client-branding')
    const result = await getClientBranding('')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.data).toBeNull()
  })

  it('returns DB_ERROR when supabase returns error', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error', code: 'PGRST000' },
    })
    const { getClientBranding } = await import('./get-client-branding')
    const result = await getClientBranding('client-1')
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('returns null when no config found', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const { getClientBranding } = await import('./get-client-branding')
    const result = await getClientBranding('client-1')
    expect(result.error).toBeNull()
    expect(result.data).toBeNull()
  })

  it('returns branding when present', async () => {
    const branding = { logoUrl: 'https://logo.png', displayName: 'ACME', accentColor: '#FF5733', updatedAt: '2026-01-01T00:00:00Z' }
    mockMaybeSingle.mockResolvedValueOnce({
      data: { custom_branding: branding },
      error: null,
    })
    const { getClientBranding } = await import('./get-client-branding')
    const result = await getClientBranding('client-1')
    expect(result.error).toBeNull()
    expect(result.data?.displayName).toBe('ACME')
    expect(result.data?.accentColor).toBe('#FF5733')
  })

  it('returns null when custom_branding is empty object', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { custom_branding: null },
      error: null,
    })
    const { getClientBranding } = await import('./get-client-branding')
    const result = await getClientBranding('client-1')
    expect(result.data).toBeNull()
  })
})
