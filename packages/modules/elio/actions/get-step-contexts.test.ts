import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getStepContexts } from './get-step-contexts'

const PARCOURS_AGENT_ID = '00000000-0000-0000-0000-000000000001'

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  for (const fn of ['select', 'eq', 'order']) {
    chain[fn] = vi.fn(() => chain)
  }
  ;(chain.order as ReturnType<typeof vi.fn>).mockResolvedValue(result)
  return chain
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

describe('getStepContexts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne une erreur si parcoursAgentId est invalide', async () => {
    const result = await getStepContexts('not-a-uuid')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne la liste des contextes pour une étape', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    const chain = makeChain({
      data: [
        {
          id: 'ctx-1',
          content_type: 'text',
          context_message: 'Précisions de MiKL',
          file_name: null,
          file_path: null,
          consumed_at: null,
          created_at: '2026-04-22T10:00:00Z',
        },
      ],
      error: null,
    })
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      from: vi.fn(() => chain),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const result = await getStepContexts(PARCOURS_AGENT_ID)
    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data![0].contextMessage).toBe('Précisions de MiKL')
    expect(result.data![0].contentType).toBe('text')
    expect(result.data![0].consumedAt).toBeNull()
  })

  it('retourne une liste vide si aucun contexte existe', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    const chain = makeChain({ data: [], error: null })
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      from: vi.fn(() => chain),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const result = await getStepContexts(PARCOURS_AGENT_ID)
    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(0)
  })

  it('retourne une erreur DB si la requête échoue', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    const chain = makeChain({ data: null, error: { message: 'Permission denied', code: '42501' } })
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      from: vi.fn(() => chain),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const result = await getStepContexts(PARCOURS_AGENT_ID)
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
