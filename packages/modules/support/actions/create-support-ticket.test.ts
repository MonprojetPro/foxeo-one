import { describe, it, expect, vi, beforeEach } from 'vitest'

const testClientId = '550e8400-e29b-41d4-a716-446655440001'
const testOperatorId = '550e8400-e29b-41d4-a716-446655440002'
const testAuthUserId = '550e8400-e29b-41d4-a716-446655440003'
const testTicketId = '550e8400-e29b-41d4-a716-446655440004'

// Mock Supabase
const mockInsertSingle = vi.fn()
const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }))
const mockInsert = vi.fn(() => ({ select: mockInsertSelect }))
const mockNotificationInsert = vi.fn().mockResolvedValue({ error: null })

const mockClientSingle = vi.fn()
const mockClientEq = vi.fn(() => ({ single: mockClientSingle }))
const mockClientSelect = vi.fn(() => ({ eq: mockClientEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'clients') {
    return { select: mockClientSelect }
  }
  if (table === 'notifications') {
    return { insert: mockNotificationInsert }
  }
  return { insert: mockInsert }
})
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

const validInput = {
  type: 'bug' as const,
  subject: 'Erreur de connexion',
  description: 'Je ne peux pas me connecter depuis ce matin',
}

const dbRow = {
  id: testTicketId,
  client_id: testClientId,
  operator_id: testOperatorId,
  type: 'bug',
  subject: 'Erreur de connexion',
  description: 'Je ne peux pas me connecter depuis ce matin',
  screenshot_url: null,
  status: 'open',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

describe('createSupportTicket Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockClientSingle.mockResolvedValue({
      data: { id: testClientId, operator_id: testOperatorId, name: 'Jean Test' },
      error: null,
    })
    mockInsertSingle.mockResolvedValue({ data: dbRow, error: null })
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No auth' } })

    const { createSupportTicket } = await import('./create-support-ticket')
    const result = await createSupportTicket(validInput)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return NOT_FOUND when client record not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })
    mockClientSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

    const { createSupportTicket } = await import('./create-support-ticket')
    const result = await createSupportTicket(validInput)

    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return VALIDATION_ERROR for invalid input', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })

    const { createSupportTicket } = await import('./create-support-ticket')
    const result = await createSupportTicket({
      type: 'bug',
      subject: 'AB', // too short
      description: 'short', // too short
    })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should create ticket and return camelCase data on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })

    const { createSupportTicket } = await import('./create-support-ticket')
    const result = await createSupportTicket(validInput)

    expect(result.error).toBeNull()
    expect(result.data).toBeDefined()
    expect(result.data?.id).toBe(testTicketId)
    expect(result.data?.clientId).toBe(testClientId)
    expect(result.data?.status).toBe('open')
  })

  it('should insert notification to MiKL operator', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })

    const { createSupportTicket } = await import('./create-support-ticket')
    await createSupportTicket(validInput)

    expect(mockNotificationInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient_type: 'operator',
        recipient_id: testOperatorId,
        type: 'alert',
      })
    )
  })

  it('should handle DB insert error gracefully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { createSupportTicket } = await import('./create-support-ticket')
    const result = await createSupportTicket(validInput)

    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('should accept optional screenshotUrl', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })
    mockInsertSingle.mockResolvedValue({
      data: { ...dbRow, screenshot_url: 'https://example.com/img.png' },
      error: null,
    })

    const { createSupportTicket } = await import('./create-support-ticket')
    const result = await createSupportTicket({
      ...validInput,
      screenshotUrl: 'https://example.com/img.png',
    })

    expect(result.data?.screenshotUrl).toBe('https://example.com/img.png')
  })
})
