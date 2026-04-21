import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { getElioLabAgents } from './get-elio-lab-agents'
import { createServerSupabaseClient } from '@monprojetpro/supabase'

const FAKE_AGENTS = [
  {
    id: 'uuid-1',
    name: 'Agent A',
    description: 'Desc A',
    model: 'claude-sonnet-4-6',
    temperature: 1.0,
    image_path: null,
    file_path: 'packages/modules/elio/agents/lab/agent-a.md',
    system_prompt: 'Prompt A',
    archived: false,
    created_at: '2026-04-21T00:00:00Z',
    updated_at: '2026-04-21T00:00:00Z',
  },
]

function makeMockOrderResult(queryResult: { data: unknown[]; error: unknown }) {
  // order() retourne un objet qui est à la fois thenable (await query)
  // ET possède .eq() pour le cas includeArchived = false
  const orderResult = {
    eq: vi.fn().mockResolvedValue(queryResult),
    then: (
      resolve: (value: { data: unknown[]; error: unknown }) => void,
      reject: (reason: unknown) => void
    ) => Promise.resolve(queryResult).then(resolve, reject),
  }
  return orderResult
}

function mockSupabase(data: unknown[], error: unknown = null) {
  const queryResult = { data, error }
  const orderResult = makeMockOrderResult(queryResult)
  const chain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnValue(orderResult),
  }
  const client = {
    from: vi.fn().mockReturnValue(chain),
  }
  vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never)
  return { client, chain, orderResult }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getElioLabAgents', () => {
  it('retourne les agents actifs par défaut (filtre archived=false)', async () => {
    const { orderResult } = mockSupabase(FAKE_AGENTS)

    const result = await getElioLabAgents()

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0].name).toBe('Agent A')
    expect(orderResult.eq).toHaveBeenCalledWith('archived', false)
  })

  it('omet le filtre archived quand includeArchived=true', async () => {
    const { orderResult } = mockSupabase(FAKE_AGENTS)

    await getElioLabAgents({ includeArchived: true })

    expect(orderResult.eq).not.toHaveBeenCalled()
  })

  it('retourne une liste vide sans erreur si aucun agent', async () => {
    mockSupabase([])

    const result = await getElioLabAgents()
    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(0)
  })

  it('retourne une erreur DB si la requête échoue', async () => {
    mockSupabase([], { message: 'DB error' })

    const result = await getElioLabAgents()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('mappe correctement temperature en nombre', async () => {
    mockSupabase([{ ...FAKE_AGENTS[0], temperature: '0.7' }])

    const result = await getElioLabAgents({ includeArchived: true })
    expect(typeof result.data?.[0].temperature).toBe('number')
    expect(result.data?.[0].temperature).toBe(0.7)
  })
})
