import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))
const mockEq1 = vi.fn()
const mockEq2 = vi.fn()
const mockEq3 = vi.fn()
const mockUpdate = vi.fn()
const mockMaybeSingle = vi.fn()
const mockEqOperator = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelectOperator = vi.fn(() => ({ eq: mockEqOperator }))
const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

describe('setOperatorOverride', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { setOperatorOverride } = await import('./set-operator-override')
    const result = await setOperatorOverride({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
      notificationType: 'message',
      operatorOverride: true,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid UUID', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const { setOperatorOverride } = await import('./set-operator-override')
    const result = await setOperatorOverride({
      clientId: 'not-a-uuid',
      notificationType: 'message',
      operatorOverride: true,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns UNAUTHORIZED when user is not an operator', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    // operators query returns no match
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return { select: mockSelectOperator }
      }
      return { update: mockUpdate }
    })

    const { setOperatorOverride } = await import('./set-operator-override')
    const result = await setOperatorOverride({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
      notificationType: 'message',
      operatorOverride: true,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
    expect(result.error?.message).toContain('opérateurs')
  })

  it('sets operator_override and returns updated pref', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    // Operator exists
    mockMaybeSingle.mockResolvedValue({ data: { id: 'op-1' }, error: null })
    mockSingle.mockResolvedValue({
      data: {
        id: 'pref-1',
        user_type: 'client',
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        notification_type: 'message',
        channel_email: true,
        channel_inapp: true,
        operator_override: true,
        created_at: '2026-02-18T10:00:00Z',
        updated_at: '2026-02-18T10:00:00Z',
      },
      error: null,
    })
    mockEq3.mockReturnValue({ select: mockSelect })
    mockEq2.mockReturnValue({ eq: mockEq3 })
    mockEq1.mockReturnValue({ eq: mockEq2 })
    mockUpdate.mockReturnValue({ eq: mockEq1 })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return { select: mockSelectOperator }
      }
      return { update: mockUpdate }
    })

    const { setOperatorOverride } = await import('./set-operator-override')
    const result = await setOperatorOverride({
      clientId: '550e8400-e29b-41d4-a716-446655440001',
      notificationType: 'message',
      operatorOverride: true,
    })

    expect(result.error).toBeNull()
    expect(result.data).toHaveProperty('operatorOverride', true)
    expect(result.data).not.toHaveProperty('operator_override')

    // update should have been called with correct args
    const updateCallArgs = mockUpdate.mock.calls[0]?.[0]
    expect(updateCallArgs).toHaveProperty('operator_override', true)
  })
})
