import { describe, it, expect, vi, beforeEach } from 'vitest'
import { startLabExitKit } from './start-lab-exit-kit'

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
    storage: {
      from: vi.fn(() => ({
        download: vi.fn().mockResolvedValue({ data: new Blob(['test']), error: null }),
        upload: vi.fn().mockResolvedValue({ error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://test.supabase.co/signed-url' },
          error: null,
        }),
      })),
    },
  })),
}))

vi.mock('../../elio/actions/export-lab-chats', () => ({
  exportLabChats: vi.fn().mockResolvedValue({
    data: { chats: [], count: 0 },
    error: null,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
})

describe('startLabExitKit', () => {
  it('rejects invalid input', async () => {
    const result = await startLabExitKit({ clientId: 'not-a-uuid' })

    expect(result.error).toBeTruthy()
    expect(result.error!.code).toBe('INVALID_INPUT')
  })

  it('rejects unauthenticated user', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'No session' } })

    const result = await startLabExitKit({
      clientId: '00000000-0000-0000-0000-000000000001',
    })

    expect(result.error!.code).toBe('UNAUTHORIZED')
  })

  it('rejects non-owner operator', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: '00000000-0000-0000-0000-000000000001', operator_id: 'other-op', status: 'active', name: 'Test', company: 'Co' },
        error: null,
      }),
    })

    const result = await startLabExitKit({
      clientId: '00000000-0000-0000-0000-000000000001',
    })

    expect(result.error!.code).toBe('FORBIDDEN')
  })

  it('rejects already archived_lab client', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: '00000000-0000-0000-0000-000000000001', operator_id: mockUser.id, status: 'archived_lab', name: 'Test', company: 'Co' },
        error: null,
      }),
    })

    const result = await startLabExitKit({
      clientId: '00000000-0000-0000-0000-000000000001',
    })

    expect(result.error!.code).toBe('ALREADY_ARCHIVED')
  })

  it('rejects non-Lab client', async () => {
    const clientId = '00000000-0000-0000-0000-000000000001'

    // clients.select().eq().single()
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: clientId, operator_id: mockUser.id, status: 'active', name: 'Test', company: 'Co' },
        error: null,
      }),
    })

    // client_configs.select().eq().single()
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { dashboard_type: 'one', graduated_at: '2026-01-01' },
        error: null,
      }),
    })

    const result = await startLabExitKit({ clientId })

    expect(result.error!.code).toBe('NOT_LAB_CLIENT')
  })
})
