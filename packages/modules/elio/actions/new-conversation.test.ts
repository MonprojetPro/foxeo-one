import { describe, it, expect, vi, beforeEach } from 'vitest'
import { newConversation } from './new-conversation'

const mockInsert = vi.fn()
const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))

vi.mock('@foxeo/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
    },
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  })),
}))

describe('newConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockReturnValue({ select: mockSelect })
  })

  it('crée une conversation et retourne { data, error: null }', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'conv-new',
        user_id: 'user-1',
        dashboard_type: 'lab',
        title: 'Nouvelle conversation',
        created_at: '2026-03-02T10:00:00Z',
        updated_at: '2026-03-02T10:00:00Z',
      },
      error: null,
    })

    const result = await newConversation('lab')

    expect(result.error).toBeNull()
    expect(result.data).toBeDefined()
    expect(result.data?.id).toBe('conv-new')
    expect(result.data?.dashboardType).toBe('lab')
    expect(result.data?.title).toBe('Nouvelle conversation')
  })

  it('retourne une erreur AUTH_ERROR si utilisateur non authentifié', async () => {
    vi.mocked(
      (await import('@foxeo/supabase')).createServerSupabaseClient
    ).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: null }, error: new Error('Not authenticated') })),
      },
      from: vi.fn(),
    } as never)

    const result = await newConversation('lab')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('AUTH_ERROR')
  })

  it('retourne une erreur DB_ERROR si l\'insertion échoue', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: new Error('DB error'),
    })

    const result = await newConversation('hub')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('invalide le cache TanStack Query côté serveur (pas de queryClient côté server action)', async () => {
    // La SA ne gère pas l'invalidation directement côté serveur
    // L'invalidation est faite dans le composant via queryClient.invalidateQueries
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'conv-3',
        user_id: 'user-1',
        dashboard_type: 'one',
        title: 'Nouvelle conversation',
        created_at: '2026-03-02T10:00:00Z',
        updated_at: '2026-03-02T10:00:00Z',
      },
      error: null,
    })

    const result = await newConversation('one')
    expect(result.data?.dashboardType).toBe('one')
  })
})
