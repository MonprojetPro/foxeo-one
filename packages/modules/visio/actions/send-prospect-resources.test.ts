import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://storage.example.com/signed' },
          error: null,
        }),
      })),
    },
  })),
}))

vi.mock('../utils/generate-resource-links', () => ({
  generateResourceLinks: vi.fn().mockResolvedValue([
    { name: 'Guide.pdf', url: 'https://storage.example.com/signed' },
  ]),
}))

const OPERATOR_ID = '00000000-0000-0000-0000-000000000001'
const MEETING_ID = '00000000-0000-0000-0000-000000000002'
const DOC_ID = '00000000-0000-0000-0000-000000000003'

const validInput = {
  meetingId: MEETING_ID,
  prospectEmail: 'prospect@example.com',
  documentIds: [DOC_ID],
}

describe('sendProspectResources', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: OPERATOR_ID } }, error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null }) })) })) }
      }
      if (table === 'meetings') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { client_id: 'client-123' }, error: null }) })) })) }
      }
      if (table === 'reminders') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }
      return {}
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })
    const { sendProspectResources } = await import('./send-prospect-resources')
    const result = await sendProspectResources(validInput)
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid email', async () => {
    const { sendProspectResources } = await import('./send-prospect-resources')
    const result = await sendProspectResources({ ...validInput, prospectEmail: 'not-an-email' })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns VALIDATION_ERROR for empty documentIds', async () => {
    const { sendProspectResources } = await import('./send-prospect-resources')
    const result = await sendProspectResources({ ...validInput, documentIds: [] })
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when operator not found', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }) })) })) }
      }
      return {}
    })
    const { sendProspectResources } = await import('./send-prospect-resources')
    const result = await sendProspectResources(validInput)
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns linksSent count on success', async () => {
    const { sendProspectResources } = await import('./send-prospect-resources')
    const result = await sendProspectResources(validInput)
    expect(result.error).toBeNull()
    expect(result.data?.linksSent).toBe(1)
  })

  it('creates reminder for follow-up', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'operators') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: OPERATOR_ID }, error: null }) })) })) }
      }
      if (table === 'meetings') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { client_id: 'client-123' }, error: null }) })) })) }
      }
      if (table === 'reminders') {
        return { insert: mockInsert }
      }
      return {}
    })
    const { sendProspectResources } = await import('./send-prospect-resources')
    await sendProspectResources(validInput)
    expect(mockInsert).toHaveBeenCalled()
  })
})
