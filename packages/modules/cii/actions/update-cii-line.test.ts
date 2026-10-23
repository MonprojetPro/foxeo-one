import { describe, it, expect, vi } from 'vitest'

function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.eq = vi.fn(self)
  chain.update = vi.fn(self)
  chain.single = vi.fn(async () => result)
  chain.then = (resolve: (v: typeof result) => void) => resolve(result)
  return chain
}

function makeSupabaseMock(status: string, updatedRow: Record<string, unknown> | null = null) {
  const statusChain = makeChain({ data: { status }, error: null })
  const updateChain = makeChain({ data: updatedRow, error: null })
  let selectCalls = 0

  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'op-auth-id' } }, error: null })),
    },
    from: vi.fn(() => {
      selectCalls += 1
      return selectCalls === 1 ? statusChain : updateChain
    }),
    _updateChain: updateChain,
  }
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

describe('updateCiiLine', () => {
  it('refuses to modify a line already transferred — preserves CII audit trail', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabaseMock('transferred') as never)

    const { updateCiiLine } = await import('./update-cii-line')
    const result = await updateCiiLine({ lineId: '22222222-2222-4222-8222-222222222222', reformulatedText: 'Nouveau texte' })

    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('allows modifying a line that is only reformulated', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    const mock = makeSupabaseMock('reformulated', {
      id: '22222222-2222-4222-8222-222222222222',
      import_id: '11111111-1111-4111-8111-111111111111',
      order_index: 0,
      function_name: 'Fonction X',
      time_raw: '2h',
      time_days: 2,
      reformulated_text: 'Nouveau texte',
      status: 'reformulated',
      created_at: '2026-10-23T00:00:00Z',
      updated_at: '2026-10-23T00:00:00Z',
    })
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock as never)

    const { updateCiiLine } = await import('./update-cii-line')
    const result = await updateCiiLine({ lineId: '22222222-2222-4222-8222-222222222222', reformulatedText: 'Nouveau texte' })

    expect(result.error).toBeNull()
    expect(result.data?.reformulatedText).toBe('Nouveau texte')
  })
})
