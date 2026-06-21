import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockAgentsOrder = vi.fn()
const mockSubsOrder = vi.fn()

const mockFrom = vi.fn((table: string) => {
  if (table === 'client_parcours_agents') {
    return { select: () => ({ eq: () => ({ order: mockAgentsOrder }) }) }
  }
  if (table === 'step_submissions') {
    return { select: () => ({ eq: () => ({ eq: () => ({ order: mockSubsOrder }) }) }) }
  }
  return {}
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'

describe('getParcoursMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockAgentsOrder.mockResolvedValue({
      data: [
        { id: 's1', step_order: 1, step_label: 'Proposition de valeur', is_enabled: true },
        { id: 's2', step_order: 2, step_label: 'Cible client', is_enabled: true },
        { id: 's3', step_order: 3, step_label: 'Étape désactivée', is_enabled: false },
      ],
      error: null,
    })
    mockSubsOrder.mockResolvedValue({
      data: [
        { parcours_step_id: 's1', submission_content: 'Vente de café de spécialité aux bureaux.', created_at: '2026-06-10T00:00:00Z' },
        { parcours_step_id: 's2', submission_content: 'PME de 10 à 50 salariés en centre-ville.', created_at: '2026-06-11T00:00:00Z' },
      ],
      error: null,
    })
  })

  it('returns UNAUTHORIZED when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'x' } })
    const { getParcoursMemory } = await import('./get-parcours-memory')
    const result = await getParcoursMemory(CLIENT_ID)
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('builds a digest of approved submissions from OTHER steps', async () => {
    const { getParcoursMemory } = await import('./get-parcours-memory')
    const result = await getParcoursMemory(CLIENT_ID, 's2')

    expect(result.error).toBeNull()
    expect(result.data?.stepCount).toBe(1) // s2 exclue (courante), s3 exclue (désactivée)
    expect(result.data?.block).toContain('Proposition de valeur')
    expect(result.data?.block).toContain('Vente de café de spécialité')
    // l'étape courante ne doit pas figurer dans son propre dossier
    expect(result.data?.block).not.toContain('Cible client')
  })

  it('excludes disabled steps from the digest', async () => {
    mockSubsOrder.mockResolvedValue({
      data: [{ parcours_step_id: 's3', submission_content: 'Contenu étape désactivée', created_at: '2026-06-12T00:00:00Z' }],
      error: null,
    })
    const { getParcoursMemory } = await import('./get-parcours-memory')
    const result = await getParcoursMemory(CLIENT_ID)
    expect(result.data?.stepCount).toBe(0)
    expect(result.data?.block).toBeNull()
  })

  it('returns null block when no approved submission exists', async () => {
    mockSubsOrder.mockResolvedValue({ data: [], error: null })
    const { getParcoursMemory } = await import('./get-parcours-memory')
    const result = await getParcoursMemory(CLIENT_ID)
    expect(result.data?.block).toBeNull()
    expect(result.data?.stepCount).toBe(0)
  })
})
