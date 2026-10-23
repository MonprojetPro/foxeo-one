import { describe, it, expect, vi } from 'vitest'

function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.eq = vi.fn(self)
  chain.in = vi.fn(self)
  chain.update = vi.fn(self)
  chain.single = vi.fn(async () => result)
  chain.then = (resolve: (v: typeof result) => void) => resolve(result)
  return chain
}

function makeSupabaseMock(overrides: {
  importRow?: { id: string; client_id: string; tjm_euros: number } | null
  lines?: Array<Record<string, unknown>>
} = {}) {
  const {
    importRow = { id: '11111111-1111-4111-8111-111111111111', client_id: '33333333-3333-4333-8333-333333333333', tjm_euros: 300 },
    lines = [{ id: '22222222-2222-4222-8222-222222222222', function_name: 'Fonction X', reformulated_text: 'Reformulation', time_days: 2, status: 'reformulated' }],
  } = overrides

  const importsChain = makeChain({ data: importRow, error: null })
  const linesSelectChain = makeChain({ data: lines, error: null })
  const linesUpdateChain = makeChain({ data: null, error: null })

  let linesCallCount = 0

  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'op-auth-id' } }, error: null })),
    },
    from: vi.fn((table: string) => {
      if (table === 'cii_imports') return importsChain
      if (table === 'cii_reformulation_lines') {
        linesCallCount += 1
        return linesCallCount === 1 ? linesSelectChain : linesUpdateChain
      }
      return makeChain({ data: null, error: null })
    }),
    _linesUpdateChain: linesUpdateChain,
  }
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@monprojetpro/modules-facturation', () => ({
  createAndSendQuote: vi.fn(async () => ({ data: 'quote-123', error: null })),
  createInvoice: vi.fn(async () => ({ data: { pennylaneInvoiceId: 'invoice-123' }, error: null })),
}))

describe('transferCiiLines', () => {
  it('refuses to transfer a line already marked as transferred — double-billing guard', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSupabaseMock({
        lines: [{ id: '22222222-2222-4222-8222-222222222222', function_name: 'Fonction X', reformulated_text: 'Reformulation', time_days: 2, status: 'transferred' }],
      }) as never
    )
    const { createAndSendQuote } = await import('@monprojetpro/modules-facturation')

    const { transferCiiLines } = await import('./transfer-cii-lines')
    const result = await transferCiiLines({ importId: '11111111-1111-4111-8111-111111111111', lineIds: ['22222222-2222-4222-8222-222222222222'], target: 'quote' })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toContain('déjà été transférée')
    expect(createAndSendQuote).not.toHaveBeenCalled()
  })

  it('refuses a line without a reformulated text', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSupabaseMock({
        lines: [{ id: '22222222-2222-4222-8222-222222222222', function_name: 'Fonction X', reformulated_text: null, time_days: 2, status: 'pending' }],
      }) as never
    )

    const { transferCiiLines } = await import('./transfer-cii-lines')
    const result = await transferCiiLines({ importId: '11111111-1111-4111-8111-111111111111', lineIds: ['22222222-2222-4222-8222-222222222222'], target: 'quote' })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toContain('reformulation')
  })

  it('refuses a line without a time', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSupabaseMock({
        lines: [{ id: '22222222-2222-4222-8222-222222222222', function_name: 'Fonction X', reformulated_text: 'Reformulation', time_days: null, status: 'reformulated' }],
      }) as never
    )

    const { transferCiiLines } = await import('./transfer-cii-lines')
    const result = await transferCiiLines({ importId: '11111111-1111-4111-8111-111111111111', lineIds: ['22222222-2222-4222-8222-222222222222'], target: 'quote' })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toContain('temps')
  })

  it('builds the LineItem from time_days * tjm and calls createAndSendQuote', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabaseMock() as never)
    const { createAndSendQuote } = await import('@monprojetpro/modules-facturation')

    const { transferCiiLines } = await import('./transfer-cii-lines')
    const result = await transferCiiLines({ importId: '11111111-1111-4111-8111-111111111111', lineIds: ['22222222-2222-4222-8222-222222222222'], target: 'quote' })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ target: 'quote', pennylaneId: 'quote-123' })
    expect(createAndSendQuote).toHaveBeenCalledWith(
      '33333333-3333-4333-8333-333333333333',
      [expect.objectContaining({ label: 'Reformulation', quantity: 2, unitPrice: 300, total: 600, unit: 'j' })],
      { sendNow: false }
    )
  })
})
