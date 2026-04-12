import { describe, it, expect, vi, beforeEach } from 'vitest'

const validClientUuid = '550e8400-e29b-41d4-a716-446655440000'
const validAuthUuid = '550e8400-e29b-41d4-a716-446655440099'

// Mock chain: .from('clients').update({...}).eq('id', ...).eq('status', 'prospect')
const mockEq2 = vi.fn()
const mockEq1 = vi.fn(() => ({ eq: mockEq2 }))
const mockUpdate = vi.fn(() => ({ eq: mockEq1 }))
const mockFrom = vi.fn(() => ({ update: mockUpdate }))
const mockGetUser = vi.fn()
const mockRpc = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
  })),
}))

describe('updateProspectStage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
    mockRpc.mockResolvedValue({ data: true, error: null })
    mockEq2.mockResolvedValue({ error: null })
  })

  it('updates to qualifié successfully', async () => {
    const { updateProspectStage } = await import('./update-prospect-stage')
    const result = await updateProspectStage(validClientUuid, 'qualifié')

    expect(result.error).toBeNull()
    expect(result.data).toBeNull()
    expect(mockUpdate).toHaveBeenCalledWith({ prospect_stage: 'qualifié' })
    expect(mockEq1).toHaveBeenCalledWith('id', validClientUuid)
    expect(mockEq2).toHaveBeenCalledWith('status', 'prospect')
  })

  it('updates to sans_suite successfully', async () => {
    const { updateProspectStage } = await import('./update-prospect-stage')
    const result = await updateProspectStage(validClientUuid, 'sans_suite')

    expect(result.error).toBeNull()
    expect(mockUpdate).toHaveBeenCalledWith({ prospect_stage: 'sans_suite' })
  })

  it('updates to nouveau successfully', async () => {
    const { updateProspectStage } = await import('./update-prospect-stage')
    const result = await updateProspectStage(validClientUuid, 'nouveau')

    expect(result.error).toBeNull()
    expect(mockUpdate).toHaveBeenCalledWith({ prospect_stage: 'nouveau' })
  })

  it('returns INVALID_INPUT for unknown stage', async () => {
    const { updateProspectStage } = await import('./update-prospect-stage')
    const result = await updateProspectStage(validClientUuid, 'unknown' as 'nouveau')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_INPUT')
  })

  it('returns UNAUTHORIZED when user not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not authenticated' } })

    const { updateProspectStage } = await import('./update-prospect-stage')
    const result = await updateProspectStage(validClientUuid, 'qualifié')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns FORBIDDEN when not an operator', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null })

    const { updateProspectStage } = await import('./update-prospect-stage')
    const result = await updateProspectStage(validClientUuid, 'qualifié')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('returns DATABASE_ERROR on supabase failure', async () => {
    mockEq2.mockResolvedValue({ error: { message: 'DB error' } })

    const { updateProspectStage } = await import('./update-prospect-stage')
    const result = await updateProspectStage(validClientUuid, 'qualifié')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })
})
