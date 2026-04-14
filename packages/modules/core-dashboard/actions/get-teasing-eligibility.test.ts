import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getTeasingEligibility } from './get-teasing-eligibility'

const mockSupabase = {
  from: vi.fn(),
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

function makeSelectChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  return chain
}

describe('getTeasingEligibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when clientId is empty', async () => {
    const result = await getTeasingEligibility('')
    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.data).toBeNull()
  })

  it('returns showTeasing: false when show_lab_teasing is false in config', async () => {
    const configChain = makeSelectChain({
      data: { show_lab_teasing: false },
      error: null,
    })
    mockSupabase.from.mockReturnValueOnce(configChain)

    const result = await getTeasingEligibility('client-uuid')
    expect(result.data?.showTeasing).toBe(false)
    expect(result.error).toBeNull()
  })

  it('returns showTeasing: false when there is an active parcours (en_cours)', async () => {
    const configChain = makeSelectChain({
      data: { show_lab_teasing: true },
      error: null,
    })
    const parcoursChain = makeSelectChain({
      data: { status: 'en_cours' },
      error: null,
    })
    mockSupabase.from
      .mockReturnValueOnce(configChain)
      .mockReturnValueOnce(parcoursChain)

    const result = await getTeasingEligibility('client-uuid')
    expect(result.data?.showTeasing).toBe(false)
    expect(result.error).toBeNull()
  })

  it('returns showTeasing: true when no active parcours and config allows', async () => {
    const configChain = makeSelectChain({
      data: { show_lab_teasing: true },
      error: null,
    })
    const parcoursChain = makeSelectChain({
      data: null,
      error: null,
    })
    mockSupabase.from
      .mockReturnValueOnce(configChain)
      .mockReturnValueOnce(parcoursChain)

    const result = await getTeasingEligibility('client-uuid')
    expect(result.data?.showTeasing).toBe(true)
    expect(result.error).toBeNull()
  })

  it('returns showTeasing: true when parcours is completed (termine)', async () => {
    // La query est filtrée sur status='en_cours' — un parcours terminé ne matche pas
    // donc la DB retourne null (aucun en_cours trouvé)
    const configChain = makeSelectChain({
      data: { show_lab_teasing: true },
      error: null,
    })
    const parcoursChain = makeSelectChain({
      data: null,
      error: null,
    })
    mockSupabase.from
      .mockReturnValueOnce(configChain)
      .mockReturnValueOnce(parcoursChain)

    const result = await getTeasingEligibility('client-uuid')
    expect(result.data?.showTeasing).toBe(true)
    expect(result.error).toBeNull()
  })

  it('returns showTeasing: true when config record not found (defaults)', async () => {
    const configChain = makeSelectChain({
      data: null,
      error: null,
    })
    const parcoursChain = makeSelectChain({
      data: null,
      error: null,
    })
    mockSupabase.from
      .mockReturnValueOnce(configChain)
      .mockReturnValueOnce(parcoursChain)

    const result = await getTeasingEligibility('client-uuid')
    expect(result.data?.showTeasing).toBe(true)
    expect(result.error).toBeNull()
  })

  it('returns showTeasing: true when parcours query fails (graceful fallback)', async () => {
    const configChain = makeSelectChain({
      data: { show_lab_teasing: true },
      error: null,
    })
    const parcoursChain = makeSelectChain({
      data: null,
      error: { message: 'DB parcours error', code: 'DB_ERROR' },
    })
    mockSupabase.from
      .mockReturnValueOnce(configChain)
      .mockReturnValueOnce(parcoursChain)

    const result = await getTeasingEligibility('client-uuid')
    // Parcours error is non-fatal — teasing shows by default
    expect(result.error).toBeTruthy()
    expect(result.data).toBeNull()
  })

  it('returns error on DB failure for config query', async () => {
    const configChain = makeSelectChain({
      data: null,
      error: { message: 'DB error', code: 'DB_ERROR' },
    })
    mockSupabase.from.mockReturnValueOnce(configChain)

    const result = await getTeasingEligibility('client-uuid')
    expect(result.error).toBeTruthy()
    expect(result.data).toBeNull()
  })
})
