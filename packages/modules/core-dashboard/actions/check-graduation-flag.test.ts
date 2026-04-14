import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockMaybeSingle = vi.fn()
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}))

describe('checkGraduationScreenFlag', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('retourne shouldShow: true quand le flag est true', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { show_graduation_screen: true },
      error: null,
    })

    const { checkGraduationScreenFlag } = await import('./check-graduation-flag')
    const result = await checkGraduationScreenFlag('client-uuid')

    expect(result.error).toBeNull()
    expect(result.data?.shouldShow).toBe(true)
  })

  it('retourne shouldShow: false quand le flag est false', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { show_graduation_screen: false },
      error: null,
    })

    const { checkGraduationScreenFlag } = await import('./check-graduation-flag')
    const result = await checkGraduationScreenFlag('client-uuid')

    expect(result.error).toBeNull()
    expect(result.data?.shouldShow).toBe(false)
  })

  it('retourne shouldShow: false quand aucune préférence trouvée (null)', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })

    const { checkGraduationScreenFlag } = await import('./check-graduation-flag')
    const result = await checkGraduationScreenFlag('client-uuid')

    expect(result.error).toBeNull()
    expect(result.data?.shouldShow).toBe(false)
  })

  it('retourne DB_ERROR si la requête échoue', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: new Error('Connection error'),
    })

    const { checkGraduationScreenFlag } = await import('./check-graduation-flag')
    const result = await checkGraduationScreenFlag('client-uuid')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('retourne VALIDATION_ERROR si clientId vide', async () => {
    const { checkGraduationScreenFlag } = await import('./check-graduation-flag')
    const result = await checkGraduationScreenFlag('')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })
})
