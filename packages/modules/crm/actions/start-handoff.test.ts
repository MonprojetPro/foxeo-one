import { describe, it, expect, vi, beforeEach } from 'vitest'
import { startHandoff } from './start-handoff'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const mockUser = { id: 'operator-uuid-123' }
const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
})

describe('startHandoff', () => {
  it('rejects invalid input', async () => {
    const result = await startHandoff({
      clientId: 'not-a-uuid',
      handoffType: 'one_shot',
      slug: 'test',
    })

    expect(result.error).toBeTruthy()
    expect(result.error!.code).toBe('INVALID_INPUT')
  })

  it('rejects unauthenticated user', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'No session' } })

    const result = await startHandoff({
      clientId: '00000000-0000-0000-0000-000000000001',
      handoffType: 'one_shot',
      slug: 'test-client',
    })

    expect(result.error).toBeTruthy()
    expect(result.error!.code).toBe('UNAUTHORIZED')
  })

  it('rejects non-owner operator', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: '00000000-0000-0000-0000-000000000001', operator_id: 'other-operator', status: 'active' },
        error: null,
      }),
    })

    const result = await startHandoff({
      clientId: '00000000-0000-0000-0000-000000000001',
      handoffType: 'one_shot',
      slug: 'test-client',
    })

    expect(result.error).toBeTruthy()
    expect(result.error!.code).toBe('FORBIDDEN')
  })

  it('rejects already handed off client', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: '00000000-0000-0000-0000-000000000001', operator_id: mockUser.id, status: 'handed_off' },
        error: null,
      }),
    })

    const result = await startHandoff({
      clientId: '00000000-0000-0000-0000-000000000001',
      handoffType: 'one_shot',
      slug: 'test-client',
    })

    expect(result.error).toBeTruthy()
    expect(result.error!.code).toBe('ALREADY_HANDED_OFF')
  })

  it('creates handoff record for valid request', async () => {
    const clientId = '00000000-0000-0000-0000-000000000001'
    const handoffId = '00000000-0000-0000-0000-000000000099'

    // clients.select().eq().single()
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: clientId, operator_id: mockUser.id, status: 'active' },
        error: null,
      }),
    })

    // client_handoffs.select().eq().not().limit().maybeSingle()
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    // client_handoffs.insert().select().single()
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: handoffId },
        error: null,
      }),
    })

    const result = await startHandoff({
      clientId,
      handoffType: 'one_shot',
      slug: 'test-client',
    })

    expect(result.error).toBeNull()
    expect(result.data!.handoffId).toBe(handoffId)
  })

  it('rejects if handoff already in progress', async () => {
    const clientId = '00000000-0000-0000-0000-000000000001'

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: clientId, operator_id: mockUser.id, status: 'active' },
        error: null,
      }),
    })

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'existing-handoff', status: 'vercel_provisioning' },
        error: null,
      }),
    })

    const result = await startHandoff({
      clientId,
      handoffType: 'one_shot',
      slug: 'test-client',
    })

    expect(result.error).toBeTruthy()
    expect(result.error!.code).toBe('HANDOFF_IN_PROGRESS')
  })

  it('rejects slug with invalid characters', async () => {
    const result = await startHandoff({
      clientId: '00000000-0000-0000-0000-000000000001',
      handoffType: 'one_shot',
      slug: 'Test Client!',
    })

    expect(result.error).toBeTruthy()
    expect(result.error!.code).toBe('INVALID_INPUT')
  })
})
