import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { duplicateElioLabAgent } from './duplicate-elio-lab-agent'
import { createServerSupabaseClient } from '@monprojetpro/supabase'

const ORIGINAL = {
  id: 'uuid-orig',
  name: 'Agent Original',
  description: 'Desc',
  model: 'claude-sonnet-4-6',
  temperature: 1.0,
  image_path: null,
  file_path: 'packages/modules/elio/agents/lab/original.md',
  system_prompt: 'Prompt',
  archived: false,
  created_at: '2026-04-21T00:00:00Z',
  updated_at: '2026-04-21T00:00:00Z',
}

const COPY = {
  ...ORIGINAL,
  id: 'uuid-copy',
  name: 'Agent Original (copie)',
  file_path: 'packages/modules/elio/agents/lab/original-copie-1234.md',
}

function mockSupabase(originalData: unknown, copyData: unknown, copyError: unknown = null) {
  const selectSingle = vi.fn().mockResolvedValueOnce({ data: originalData, error: null })
  const insertChain = {
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: copyData, error: copyError }),
  }

  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: selectSingle,
    insert: vi.fn().mockReturnValue(insertChain),
  }

  const client = { from: vi.fn().mockReturnValue(chain) }
  vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never)
  return { client, chain, insertChain }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('duplicateElioLabAgent', () => {
  it('crée une copie avec le suffixe (copie)', async () => {
    mockSupabase(ORIGINAL, COPY)

    const result = await duplicateElioLabAgent('uuid-orig')

    expect(result.error).toBeNull()
    expect(result.data?.name).toBe('Agent Original (copie)')
    expect(result.data?.archived).toBe(false)
  })

  it('retourne une erreur de validation si agentId vide', async () => {
    const result = await duplicateElioLabAgent('')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne NOT_FOUND si agent introuvable', async () => {
    mockSupabase(null, null)

    const result = await duplicateElioLabAgent('uuid-inexistant')
    expect(result.error?.code).toBe('NOT_FOUND')
  })
})
