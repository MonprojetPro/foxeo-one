import { describe, it, expect, vi, beforeEach } from 'vitest'

const validClientUuid = '550e8400-e29b-41d4-a716-446655440001'
const validOperatorUuid = '550e8400-e29b-41d4-a716-446655440002'
const validAuthUuid = '550e8400-e29b-41d4-a716-446655440099'
const validExportUuid = '550e8400-e29b-41d4-a716-446655440010'

// Single mock for the final terminal call (maybeSingle / single)
const mockClientTerminal = vi.fn()
const mockOpSingle = vi.fn()
const mockExportSelectSingle = vi.fn()
const mockExportConflictCheck = vi.fn()
const mockInsertActivity = vi.fn()

// client chain: .select(...).eq(...).eq(...).maybeSingle()  — supports unlimited .eq()
const makeEqChain = (terminal: ReturnType<typeof vi.fn>) => {
  const chain: Record<string, unknown> = {}
  chain['maybeSingle'] = terminal
  chain['single'] = terminal
  chain['eq'] = vi.fn(() => chain)
  return chain
}

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: mockOpSingle })),
      })),
    }
  }
  if (table === 'clients') {
    return {
      select: vi.fn(() => makeEqChain(mockClientTerminal)),
    }
  }
  if (table === 'data_exports') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => ({
            maybeSingle: mockExportConflictCheck,
          })),
        })),
      })),
      insert: vi.fn((data) => ({
        select: vi.fn(() => ({
          single: vi.fn(() => mockExportSelectSingle(data)),
        })),
      })),
    }
  }
  if (table === 'activity_logs') {
    return { insert: mockInsertActivity }
  }
  return {}
})

const mockGetUser = vi.fn()
const mockFunctionsInvoke = vi.fn().mockResolvedValue({ error: null })

vi.mock('@foxeo/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
    functions: { invoke: mockFunctionsInvoke },
  })),
}))

describe('exportClientData Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsertActivity.mockResolvedValue({ error: null })
    mockFunctionsInvoke.mockResolvedValue({ error: null })
    mockExportConflictCheck.mockResolvedValue({ data: null, error: null })
  })

  it('should return VALIDATION_ERROR for non-UUID clientId', async () => {
    const { exportClientData } = await import('./export-client-data')
    const result = await exportClientData({ clientId: 'not-a-uuid', requestedBy: 'client' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('should return VALIDATION_ERROR for invalid requestedBy value', async () => {
    const { exportClientData } = await import('./export-client-data')
    const result = await exportClientData({
      clientId: validClientUuid,
      requestedBy: 'unknown' as 'client',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { exportClientData } = await import('./export-client-data')
    const result = await exportClientData({ clientId: validClientUuid, requestedBy: 'client' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  describe('requestedBy = client', () => {
    it('should return NOT_FOUND when client is not found by auth_user_id', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
      mockClientTerminal.mockResolvedValue({ data: null, error: null })

      const { exportClientData } = await import('./export-client-data')
      const result = await exportClientData({ clientId: validClientUuid, requestedBy: 'client' })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('NOT_FOUND')
    })

    it('should return UNAUTHORIZED when client tries to export another client data', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
      // Client found but with different ID than requested
      mockClientTerminal.mockResolvedValue({
        data: { id: '999e8400-e29b-41d4-a716-999999999999' },
        error: null,
      })

      const { exportClientData } = await import('./export-client-data')
      const result = await exportClientData({ clientId: validClientUuid, requestedBy: 'client' })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })

    it('should create export record and trigger generation for client', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
      mockClientTerminal.mockResolvedValue({ data: { id: validClientUuid }, error: null })
      mockExportSelectSingle.mockResolvedValue({
        data: { id: validExportUuid },
        error: null,
      })

      const { exportClientData } = await import('./export-client-data')
      const result = await exportClientData({ clientId: validClientUuid, requestedBy: 'client' })

      expect(result.error).toBeNull()
      expect(result.data?.exportId).toBe(validExportUuid)
      expect(mockExportSelectSingle).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: validClientUuid,
          requested_by: 'client',
          requester_id: validAuthUuid,
          status: 'pending',
        })
      )
    })
  })

  describe('requestedBy = operator', () => {
    it('should return NOT_FOUND when operator record not found', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
      mockOpSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

      const { exportClientData } = await import('./export-client-data')
      const result = await exportClientData({ clientId: validClientUuid, requestedBy: 'operator' })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('NOT_FOUND')
    })

    it('should return UNAUTHORIZED when operator does not own the client', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
      mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
      // client lookup returns null → operator doesn't own this client
      mockClientTerminal.mockResolvedValue({ data: null, error: null })

      const { exportClientData } = await import('./export-client-data')
      const result = await exportClientData({ clientId: validClientUuid, requestedBy: 'operator' })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })

    it('should create export record for operator-triggered export', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
      mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
      mockClientTerminal.mockResolvedValue({ data: { id: validClientUuid }, error: null })
      mockExportSelectSingle.mockResolvedValue({
        data: { id: validExportUuid },
        error: null,
      })

      const { exportClientData } = await import('./export-client-data')
      const result = await exportClientData({ clientId: validClientUuid, requestedBy: 'operator' })

      expect(result.error).toBeNull()
      expect(result.data?.exportId).toBe(validExportUuid)
      expect(mockExportSelectSingle).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: validClientUuid,
          requested_by: 'operator',
          requester_id: validOperatorUuid,
          status: 'pending',
        })
      )
    })
  })

  it('should return CONFLICT when an export is already pending/processing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
    mockClientTerminal.mockResolvedValue({ data: { id: validClientUuid }, error: null })
    mockExportConflictCheck.mockResolvedValue({
      data: { id: '999e8400-e29b-41d4-a716-446655440099', status: 'processing' },
      error: null,
    })

    const { exportClientData } = await import('./export-client-data')
    const result = await exportClientData({ clientId: validClientUuid, requestedBy: 'client' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('CONFLICT')
  })

  it('should return DATABASE_ERROR when export insert fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
    mockClientTerminal.mockResolvedValue({ data: { id: validClientUuid }, error: null })
    mockExportSelectSingle.mockResolvedValue({
      data: null,
      error: { message: 'Insert failed', code: '500' },
    })

    const { exportClientData } = await import('./export-client-data')
    const result = await exportClientData({ clientId: validClientUuid, requestedBy: 'client' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })
})
