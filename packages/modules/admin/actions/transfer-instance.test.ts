import { describe, it, expect, vi, beforeEach } from 'vitest'

const validClientUuid = '550e8400-e29b-41d4-a716-446655440001'
const validOperatorUuid = '550e8400-e29b-41d4-a716-446655440002'
const validAuthUuid = '550e8400-e29b-41d4-a716-446655440099'
const validInstanceUuid = '550e8400-e29b-41d4-a716-446655440010'
const validTransferUuid = '550e8400-e29b-41d4-a716-446655440020'

const VALID_RECIPIENT = 'client@example.com'

// Terminal mocks
const mockOpSingle = vi.fn()
const mockClientTerminal = vi.fn()
const mockInstanceTerminal = vi.fn()
const mockTransferInsertSingle = vi.fn()
const mockActivityInsert = vi.fn()
const mockExistingTransferTerminal = vi.fn()

// Recursive .eq() chain helper
const makeEqChain = (terminal: ReturnType<typeof vi.fn>) => {
  const chain: Record<string, unknown> = {}
  chain['maybeSingle'] = terminal
  chain['single'] = terminal
  chain['eq'] = vi.fn(() => chain)
  chain['in'] = vi.fn(() => chain)
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
  if (table === 'client_instances') {
    return {
      select: vi.fn(() => makeEqChain(mockInstanceTerminal)),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
    }
  }
  if (table === 'instance_transfers') {
    return {
      select: vi.fn(() => makeEqChain(mockExistingTransferTerminal)),
      insert: vi.fn((data) => ({
        select: vi.fn(() => ({
          single: vi.fn(() => mockTransferInsertSingle(data)),
        })),
      })),
    }
  }
  if (table === 'activity_logs') {
    return { insert: mockActivityInsert }
  }
  return {}
})

const mockGetUser = vi.fn()
const mockFunctionsInvoke = vi.fn().mockResolvedValue({ error: null })

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
    functions: { invoke: mockFunctionsInvoke },
  })),
}))

describe('transferInstanceToClient Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockActivityInsert.mockResolvedValue({ error: null })
    mockFunctionsInvoke.mockResolvedValue({ error: null })
    mockExistingTransferTerminal.mockResolvedValue({ data: null, error: null })
  })

  it('should return VALIDATION_ERROR for non-UUID clientId', async () => {
    const { transferInstanceToClient } = await import('./transfer-instance')
    const result = await transferInstanceToClient({
      clientId: 'not-a-uuid',
      recipientEmail: VALID_RECIPIENT,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('should return VALIDATION_ERROR for invalid email', async () => {
    const { transferInstanceToClient } = await import('./transfer-instance')
    const result = await transferInstanceToClient({
      clientId: validClientUuid,
      recipientEmail: 'not-an-email',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { transferInstanceToClient } = await import('./transfer-instance')
    const result = await transferInstanceToClient({
      clientId: validClientUuid,
      recipientEmail: VALID_RECIPIENT,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return NOT_FOUND when operator is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
    mockOpSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { transferInstanceToClient } = await import('./transfer-instance')
    const result = await transferInstanceToClient({
      clientId: validClientUuid,
      recipientEmail: VALID_RECIPIENT,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return UNAUTHORIZED when operator does not own the client', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
    mockClientTerminal.mockResolvedValue({ data: null, error: null })

    const { transferInstanceToClient } = await import('./transfer-instance')
    const result = await transferInstanceToClient({
      clientId: validClientUuid,
      recipientEmail: VALID_RECIPIENT,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return NOT_FOUND when client has no active instance', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
    mockClientTerminal.mockResolvedValue({
      data: { id: validClientUuid, email: 'client@example.com', client_configs: { dashboard_type: 'one' } },
      error: null,
    })
    mockInstanceTerminal.mockResolvedValue({ data: null, error: null })

    const { transferInstanceToClient } = await import('./transfer-instance')
    const result = await transferInstanceToClient({
      clientId: validClientUuid,
      recipientEmail: VALID_RECIPIENT,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return CONFLICT when instance is already transferred', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
    mockClientTerminal.mockResolvedValue({
      data: { id: validClientUuid, email: 'client@example.com', client_configs: { dashboard_type: 'one' } },
      error: null,
    })
    mockInstanceTerminal.mockResolvedValue({
      data: { id: validInstanceUuid, status: 'transferred' },
      error: null,
    })

    const { transferInstanceToClient } = await import('./transfer-instance')
    const result = await transferInstanceToClient({
      clientId: validClientUuid,
      recipientEmail: VALID_RECIPIENT,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INSTANCE_ALREADY_TRANSFERRED')
  })

  it('should return INVALID_CLIENT_TYPE when client is not a One client', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
    mockClientTerminal.mockResolvedValue({
      data: { id: validClientUuid, email: 'client@example.com', client_configs: { dashboard_type: 'lab' } },
      error: null,
    })

    const { transferInstanceToClient } = await import('./transfer-instance')
    const result = await transferInstanceToClient({
      clientId: validClientUuid,
      recipientEmail: VALID_RECIPIENT,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('INVALID_CLIENT_TYPE')
  })

  it('should return TRANSFER_ALREADY_IN_PROGRESS when duplicate pending transfer exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
    mockClientTerminal.mockResolvedValue({
      data: { id: validClientUuid, email: 'client@example.com', client_configs: { dashboard_type: 'one' } },
      error: null,
    })
    mockInstanceTerminal.mockResolvedValue({
      data: { id: validInstanceUuid, status: 'active' },
      error: null,
    })
    mockExistingTransferTerminal.mockResolvedValue({
      data: { id: 'existing-transfer-id', status: 'pending' },
      error: null,
    })

    const { transferInstanceToClient } = await import('./transfer-instance')
    const result = await transferInstanceToClient({
      clientId: validClientUuid,
      recipientEmail: VALID_RECIPIENT,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('TRANSFER_ALREADY_IN_PROGRESS')
  })

  it('should create transfer record and update instance status to transferring', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
    mockClientTerminal.mockResolvedValue({
      data: { id: validClientUuid, email: 'client@example.com', client_configs: { dashboard_type: 'one' } },
      error: null,
    })
    mockInstanceTerminal.mockResolvedValue({
      data: { id: validInstanceUuid, status: 'active' },
      error: null,
    })
    mockTransferInsertSingle.mockResolvedValue({
      data: { id: validTransferUuid },
      error: null,
    })

    const { transferInstanceToClient } = await import('./transfer-instance')
    const result = await transferInstanceToClient({
      clientId: validClientUuid,
      recipientEmail: VALID_RECIPIENT,
    })

    expect(result.error).toBeNull()
    expect(result.data?.transferId).toBe(validTransferUuid)
    expect(mockTransferInsertSingle).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: validClientUuid,
        instance_id: validInstanceUuid,
        recipient_email: VALID_RECIPIENT,
        status: 'pending',
      })
    )
    expect(mockFunctionsInvoke).toHaveBeenCalledWith(
      'transfer-client-instance',
      expect.objectContaining({
        body: expect.objectContaining({ transferId: validTransferUuid }),
      })
    )
  })

  it('should return DATABASE_ERROR when transfer insert fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: validAuthUuid } }, error: null })
    mockOpSingle.mockResolvedValue({ data: { id: validOperatorUuid }, error: null })
    mockClientTerminal.mockResolvedValue({
      data: { id: validClientUuid, email: 'client@example.com', client_configs: { dashboard_type: 'one' } },
      error: null,
    })
    mockInstanceTerminal.mockResolvedValue({
      data: { id: validInstanceUuid, status: 'active' },
      error: null,
    })
    mockTransferInsertSingle.mockResolvedValue({
      data: null,
      error: { message: 'Insert failed', code: '500' },
    })

    const { transferInstanceToClient } = await import('./transfer-instance')
    const result = await transferInstanceToClient({
      clientId: validClientUuid,
      recipientEmail: VALID_RECIPIENT,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })
})
