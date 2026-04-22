import { describe, it, expect, vi, beforeEach } from 'vitest'
import { markInjectionsRead } from './mark-injections-read'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const STEP_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const USER_ID = 'bbbbbbbb-0000-0000-0000-000000000002'
const CLIENT_ID = 'cccccccc-0000-0000-0000-000000000003'

function buildMocks({
  hasClient = true,
  updateCount = 2,
  updateError = null,
}: {
  hasClient?: boolean
  updateCount?: number
  updateError?: { message: string } | null
} = {}) {
  mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } }, error: null })

  mockFrom.mockImplementation((table: string) => {
    if (table === 'clients') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue(
              hasClient
                ? { data: { id: CLIENT_ID }, error: null }
                : { data: null, error: null }
            ),
          }),
        }),
      }
    }
    if (table === 'step_feedback_injections') {
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue(
              updateError
                ? { data: null, error: updateError }
                : { data: Array(updateCount).fill({ id: 'some-id' }), error: null }
            ),
          }),
        }),
      }
    }
    return {}
  })
}

describe('markInjectionsRead', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne VALIDATION_ERROR si stepId vide', async () => {
    const result = await markInjectionsRead('')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne UNAUTHORIZED si non connecté', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('not auth') })
    mockFrom.mockReturnValue({})

    const result = await markInjectionsRead(STEP_ID)
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('retourne NOT_FOUND si client introuvable', async () => {
    buildMocks({ hasClient: false })

    const result = await markInjectionsRead(STEP_ID)
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('marque les injections comme lues et retourne le count', async () => {
    buildMocks({ updateCount: 3 })

    const result = await markInjectionsRead(STEP_ID)
    expect(result.error).toBeNull()
    expect(result.data?.updatedCount).toBe(3)
  })

  it('retourne updatedCount 0 si aucune injection non lue', async () => {
    buildMocks({ updateCount: 0 })

    const result = await markInjectionsRead(STEP_ID)
    expect(result.error).toBeNull()
    expect(result.data?.updatedCount).toBe(0)
  })

  it('retourne DB_ERROR si la mise à jour échoue', async () => {
    buildMocks({ updateError: { message: 'update failed' } })

    const result = await markInjectionsRead(STEP_ID)
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
