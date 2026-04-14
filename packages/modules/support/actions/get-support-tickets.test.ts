import { describe, it, expect, vi, beforeEach } from 'vitest'

const testAuthUserId = '550e8400-e29b-41d4-a716-446655440003'
const testClientId = '550e8400-e29b-41d4-a716-446655440001'

// Mock Supabase — chainable query builder
const mockQueryResult = vi.fn()

// Build a chainable mock that returns itself for any chained call
function createChainableMock(finalResult: () => unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const handler = {
    get(_target: unknown, prop: string) {
      if (prop === 'then') {
        // Make it thenable so `await query` resolves to finalResult
        return (resolve: (v: unknown) => void) => resolve(finalResult())
      }
      if (!chain[prop]) {
        chain[prop] = vi.fn(() => new Proxy({}, handler))
      }
      return chain[prop]
    },
  }
  return new Proxy({}, handler)
}

const mockGetUser = vi.fn()

let currentQueryResult: unknown = { data: [], error: null }

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            eq: vi.fn(() => currentQueryResult),
            then: (resolve: (v: unknown) => void) => resolve(currentQueryResult),
          })),
        })),
      })),
    })),
    auth: { getUser: mockGetUser },
  })),
}))

const dbRows = [
  {
    id: '1',
    client_id: testClientId,
    operator_id: 'op-1',
    type: 'bug',
    subject: 'Test bug',
    description: 'A bug description',
    screenshot_url: null,
    status: 'open',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
]

describe('getSupportTickets Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    currentQueryResult = { data: [], error: null }
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No auth' } })

    const { getSupportTickets } = await import('./get-support-tickets')
    const result = await getSupportTickets()

    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return tickets with camelCase keys', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })
    currentQueryResult = { data: dbRows, error: null }

    const { getSupportTickets } = await import('./get-support-tickets')
    const result = await getSupportTickets()

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0]?.clientId).toBe(testClientId)
    expect(result.data?.[0]?.status).toBe('open')
  })

  it('should filter by clientId when provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })
    currentQueryResult = { data: dbRows, error: null }

    const { getSupportTickets } = await import('./get-support-tickets')
    const result = await getSupportTickets({ clientId: testClientId })

    expect(result.data).toHaveLength(1)
  })

  it('should return empty array when no tickets exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })
    currentQueryResult = { data: [], error: null }

    const { getSupportTickets } = await import('./get-support-tickets')
    const result = await getSupportTickets()

    expect(result.data).toEqual([])
  })

  it('should handle DB error gracefully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testAuthUserId } }, error: null })
    currentQueryResult = { data: null, error: { message: 'DB error' } }

    const { getSupportTickets } = await import('./get-support-tickets')
    const result = await getSupportTickets()

    expect(result.error?.code).toBe('DB_ERROR')
  })
})
