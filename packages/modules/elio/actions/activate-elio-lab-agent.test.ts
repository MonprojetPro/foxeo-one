import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { activateElioLabAgent } from './activate-elio-lab-agent'
import { createServerSupabaseClient } from '@monprojetpro/supabase'

function mockSupabase(singleResult: { data: unknown | null; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(singleResult),
  }
  const fromChain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ...chain,
  }
  const client = { from: vi.fn().mockReturnValue(fromChain) }
  vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never)
  return { client, fromChain }
}

describe('activateElioLabAgent', () => {
  beforeEach(() => vi.resetAllMocks())

  it('retourne VALIDATION_ERROR si agentId vide', async () => {
    const result = await activateElioLabAgent('')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('active l\'agent et retourne null', async () => {
    mockSupabase({ data: { id: 'uuid-1' }, error: null })
    const result = await activateElioLabAgent('uuid-1')
    expect(result.error).toBeNull()
    expect(result.data).toBeNull()
  })

  it('retourne NOT_FOUND si agent inexistant', async () => {
    mockSupabase({ data: null, error: { message: 'Not found' } })
    const result = await activateElioLabAgent('uuid-unknown')
    expect(result.error?.code).toBe('NOT_FOUND')
  })
})
