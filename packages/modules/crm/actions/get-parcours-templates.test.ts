import { describe, it, expect, vi, beforeEach } from 'vitest'

const testOperatorId = '550e8400-e29b-41d4-a716-446655440000'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Supabase
const mockOrder = vi.fn()
const mockEqActive = vi.fn(() => ({ order: mockOrder }))
const mockSelect = vi.fn(() => ({ eq: mockEqActive }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))
const mockGetUser = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))

describe('getParcoursTemplates Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should return UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const { getParcoursTemplates } = await import('./get-parcours-templates')
    const result = await getParcoursTemplates()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('should return empty array when no templates exist', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    mockOrder.mockResolvedValue({ data: [], error: null })

    const { getParcoursTemplates } = await import('./get-parcours-templates')
    const result = await getParcoursTemplates()

    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('should return templates with camelCase transformation', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    const now = new Date().toISOString()
    mockOrder.mockResolvedValue({
      data: [
        {
          id: '550e8400-e29b-41d4-a716-446655440099',
          operator_id: testOperatorId,
          name: 'Parcours Complet',
          description: 'Description',
          parcours_type: 'complet',
          stages: [
            { key: 'vision', name: 'Vision', description: 'Desc', order: 1 },
          ],
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ],
      error: null,
    })

    const { getParcoursTemplates } = await import('./get-parcours-templates')
    const result = await getParcoursTemplates()

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0]).toHaveProperty('operatorId')
    expect(result.data?.[0]).toHaveProperty('parcoursType')
    expect(result.data?.[0]).toHaveProperty('isActive')
    expect(result.data?.[0]).not.toHaveProperty('operator_id')
    expect(result.data?.[0]?.name).toBe('Parcours Complet')
  })

  it('should return DATABASE_ERROR on Supabase failure', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: testOperatorId } },
      error: null,
    })

    mockOrder.mockResolvedValue({
      data: null,
      error: { message: 'Query failed', code: 'PGRST301' },
    })

    const { getParcoursTemplates } = await import('./get-parcours-templates')
    const result = await getParcoursTemplates()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should always return { data, error } format', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Error' },
    })

    const { getParcoursTemplates } = await import('./get-parcours-templates')
    const result = await getParcoursTemplates()

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
  })
})
