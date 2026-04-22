import { describe, it, expect, vi, beforeEach } from 'vitest'
import { consumeStepContext } from './consume-step-context'

const CONTEXT_ID = '00000000-0000-0000-0000-000000000001'

function makeUpdateChain(result: { error: unknown }) {
  const chain: Record<string, unknown> = {}
  const fns = ['update', 'eq', 'is']
  for (const fn of fns) {
    chain[fn] = vi.fn(() => chain)
  }
  ;(chain.is as ReturnType<typeof vi.fn>).mockResolvedValue(result)
  return chain
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve({ from: vi.fn() })),
}))

describe('consumeStepContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne une erreur si contextId est invalide', async () => {
    const result = await consumeStepContext('not-a-uuid')
    expect(result.error).not.toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('marque le contexte comme consommé avec succès', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    const chain = makeUpdateChain({ error: null })
    vi.mocked(createServerSupabaseClient).mockResolvedValueOnce({
      from: vi.fn(() => chain),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const result = await consumeStepContext(CONTEXT_ID)

    expect(result.error).toBeNull()
    expect(result.data?.consumed).toBe(true)
  })

  it('retourne une erreur DB si la mise à jour échoue', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    const chain = makeUpdateChain({ error: { message: 'Permission denied', code: '42501' } })
    vi.mocked(createServerSupabaseClient).mockResolvedValueOnce({
      from: vi.fn(() => chain),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const result = await consumeStepContext(CONTEXT_ID)

    expect(result.error).not.toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('est idempotent : peut être appelé sur un contexte déjà consommé sans erreur', async () => {
    // Si consumed_at IS NULL ne match pas (déjà consommé), Supabase ne retourne pas d'erreur
    // mais n'effectue aucune mise à jour — comportement normal, pas d'erreur
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    const chain = makeUpdateChain({ error: null })
    vi.mocked(createServerSupabaseClient).mockResolvedValueOnce({
      from: vi.fn(() => chain),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const result = await consumeStepContext(CONTEXT_ID)

    expect(result.error).toBeNull()
    expect(result.data?.consumed).toBe(true)
  })
})
