import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUpsert = vi.fn()
const mockFrom = vi.fn(() => ({ upsert: mockUpsert }))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}))

describe('dismissGraduationScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('remet le flag à false et retourne { data: true, error: null }', async () => {
    mockUpsert.mockResolvedValueOnce({ error: null })

    const { dismissGraduationScreen } = await import('./dismiss-graduation-screen')
    const result = await dismissGraduationScreen('client-uuid')

    expect(result.error).toBeNull()
    expect(result.data).toBe(true)
  })

  it('appelle upsert avec client_id et show_graduation_screen: false', async () => {
    mockUpsert.mockResolvedValueOnce({ error: null })

    const { dismissGraduationScreen } = await import('./dismiss-graduation-screen')
    await dismissGraduationScreen('client-abc')

    expect(mockUpsert).toHaveBeenCalledWith(
      { client_id: 'client-abc', show_graduation_screen: false },
      { onConflict: 'client_id' }
    )
  })

  it('retourne DB_ERROR si l\'upsert échoue', async () => {
    mockUpsert.mockResolvedValueOnce({ error: new Error('Constraint violation') })

    const { dismissGraduationScreen } = await import('./dismiss-graduation-screen')
    const result = await dismissGraduationScreen('client-uuid')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('retourne VALIDATION_ERROR si clientId vide', async () => {
    const { dismissGraduationScreen } = await import('./dismiss-graduation-screen')
    const result = await dismissGraduationScreen('')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })
})
