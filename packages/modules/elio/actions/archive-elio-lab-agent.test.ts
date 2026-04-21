import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { archiveElioLabAgent } from './archive-elio-lab-agent'
import { createServerSupabaseClient } from '@monprojetpro/supabase'

function mockSupabase(singleResult: { data: unknown; error: unknown }) {
  const chain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(singleResult),
  }
  const client = { from: vi.fn().mockReturnValue(chain) }
  vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never)
  return { client, chain }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('archiveElioLabAgent', () => {
  it('archive un agent avec succès', async () => {
    const { chain } = mockSupabase({ data: { id: 'uuid-1' }, error: null })

    const result = await archiveElioLabAgent('uuid-1')

    expect(result.error).toBeNull()
    expect(chain.update).toHaveBeenCalledWith({ archived: true })
    expect(chain.eq).toHaveBeenCalledWith('id', 'uuid-1')
    expect(chain.select).toHaveBeenCalledWith('id')
    expect(chain.single).toHaveBeenCalled()
  })

  it('retourne une erreur de validation si agentId vide', async () => {
    const result = await archiveElioLabAgent('')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne NOT_FOUND si update échoue ou agent inexistant', async () => {
    mockSupabase({ data: null, error: { message: 'DB error' } })

    const result = await archiveElioLabAgent('uuid-inexistant')
    expect(result.error?.code).toBe('NOT_FOUND')
  })
})
