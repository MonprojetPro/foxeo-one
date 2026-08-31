import { describe, it, expect, vi, beforeEach } from 'vitest'

const testAuthUserId = '550e8400-e29b-41d4-a716-446655440003'
const testOperatorId = '550e8400-e29b-41d4-a716-446655440002'
const testTicketId = '550e8400-e29b-41d4-a716-446655440004'

// Mock Supabase
const mockUpdateSingle = vi.fn()
const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
const mockUpdateEqOperator = vi.fn(() => ({ select: mockUpdateSelect }))
const mockUpdateEqId = vi.fn(() => ({ eq: mockUpdateEqOperator }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEqId }))

// support_tickets : pré-lecture du statut existant (select status → eq → eq → single)
const mockExistingSingle = vi.fn()
const mockExistingEqOperator = vi.fn(() => ({ single: mockExistingSingle }))
const mockExistingEqId = vi.fn(() => ({ eq: mockExistingEqOperator }))
const mockTicketSelect = vi.fn(() => ({ eq: mockExistingEqId }))

const mockOpSingle = vi.fn()
const mockOpEq = vi.fn(() => ({ single: mockOpSingle }))
const mockOpSelect = vi.fn(() => ({ eq: mockOpEq }))

// clients : lookup auth_user_id (select → eq → single)
const mockClientSingle = vi.fn()
const mockClientEq = vi.fn(() => ({ single: mockClientSingle }))
const mockClientSelect = vi.fn(() => ({ eq: mockClientEq }))

// notifications : insert (awaité → résout { error })
const mockNotifInsert = vi.fn(() => Promise.resolve({ error: null }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') return { select: mockOpSelect }
  if (table === 'support_tickets') return { update: mockUpdate, select: mockTicketSelect }
  if (table === 'clients') return { select: mockClientSelect }
  if (table === 'notifications') return { insert: mockNotifInsert }
  return {}
})
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

const dbRow = {
  id: testTicketId,
  client_id: 'c-1',
  operator_id: testOperatorId,
  type: 'bug',
  subject: 'Test',
  description: 'Description',
  screenshot_urls: [],
  status: 'in_progress',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-02T00:00:00Z',
}

describe('updateTicketStatus Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockOpSingle.mockResolvedValue({ data: { id: testOperatorId }, error: null })
    mockUpdateSingle.mockResolvedValue({ data: dbRow, error: null })
    mockExistingSingle.mockResolvedValue({ data: { status: 'open' }, error: null })
    mockClientSingle.mockResolvedValue({ data: { auth_user_id: testAuthUserId }, error: null })
    mockNotifInsert.mockResolvedValue({ error: null })
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No auth' } })

    const { updateTicketStatus } = await import('./update-ticket-status')
    const result = await updateTicketStatus({ ticketId: testTicketId, status: 'in_progress' })

    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return VALIDATION_ERROR for invalid status', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })

    const { updateTicketStatus } = await import('./update-ticket-status')
    const result = await updateTicketStatus({
      ticketId: testTicketId,
      status: 'invalid' as never,
    })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return NOT_FOUND when operator not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })
    mockOpSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

    const { updateTicketStatus } = await import('./update-ticket-status')
    const result = await updateTicketStatus({ ticketId: testTicketId, status: 'in_progress' })

    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should update status and return camelCase data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })

    const { updateTicketStatus } = await import('./update-ticket-status')
    const result = await updateTicketStatus({ ticketId: testTicketId, status: 'in_progress' })

    expect(result.error).toBeNull()
    expect(result.data?.status).toBe('in_progress')
    expect(result.data?.id).toBe(testTicketId)
  })

  it('should filter by operator_id for security', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })

    const { updateTicketStatus } = await import('./update-ticket-status')
    await updateTicketStatus({ ticketId: testTicketId, status: 'resolved' })

    expect(mockUpdateEqId).toHaveBeenCalledWith('id', testTicketId)
    expect(mockUpdateEqOperator).toHaveBeenCalledWith('operator_id', testOperatorId)
  })

  it('should handle DB update error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })
    mockUpdateSingle.mockResolvedValue({ data: null, error: { message: 'Update failed' } })

    const { updateTicketStatus } = await import('./update-ticket-status')
    const result = await updateTicketStatus({ ticketId: testTicketId, status: 'closed' })

    expect(result.error?.code).toBe('DB_ERROR')
  })
})
