import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('fs')

// path.join réel — readdirSync est mocké donc peu importe le chemin réel
vi.mock('path', async (importOriginal) => {
  const actual = await importOriginal<typeof import('path')>()
  return { ...actual }
})

import { syncElioLabAgents } from './sync-elio-lab-agents'
import { createServerSupabaseClient } from '@monprojetpro/supabase'

const mockFs = vi.mocked(fs)

const EXAMPLE_MD = `---
name: Agent Test
description: Un agent de test
model: claude-sonnet-4-6
temperature: 0.8
image_path: /elio/agents/test.png
---

Tu es un agent de test.
`

function mockSupabase(selectResult: { data: unknown[] | null; error: unknown }) {
  const upsertChain = {
    select: vi.fn().mockResolvedValue(selectResult),
  }
  const fromChain = {
    upsert: vi.fn().mockReturnValue(upsertChain),
  }
  const client = {
    from: vi.fn().mockReturnValue(fromChain),
  }
  vi.mocked(createServerSupabaseClient).mockResolvedValue(client as never)
  return { client, fromChain, upsertChain }
}

describe('syncElioLabAgents', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('retourne synced:0 si aucun fichier .md', async () => {
    mockFs.readdirSync.mockReturnValue(['README.txt'] as never)
    mockSupabase({ data: [], error: null })

    const result = await syncElioLabAgents()
    expect(result.error).toBeNull()
    expect(result.data?.synced).toBe(0)
    expect(result.data?.agents).toHaveLength(0)
  })

  it('parse le frontmatter et fait un upsert', async () => {
    mockFs.readdirSync.mockReturnValue(['agent-test.md'] as never)
    mockFs.readFileSync.mockReturnValue(EXAMPLE_MD as never)

    const fakeAgent = {
      id: 'uuid-1',
      name: 'Agent Test',
      description: 'Un agent de test',
      model: 'claude-sonnet-4-6',
      temperature: 0.8,
      image_path: '/elio/agents/test.png',
      file_path: 'packages/modules/elio/agents/lab/agent-test.md',
      system_prompt: 'Tu es un agent de test.',
      archived: false,
      created_at: '2026-04-21T00:00:00Z',
      updated_at: '2026-04-21T00:00:00Z',
    }

    const { upsertChain } = mockSupabase({ data: [fakeAgent], error: null })

    const result = await syncElioLabAgents()

    expect(result.error).toBeNull()
    expect(result.data?.synced).toBe(1)
    expect(upsertChain.select).toHaveBeenCalled()
  })

  it('retourne une erreur DB si upsert échoue', async () => {
    mockFs.readdirSync.mockReturnValue(['agent.md'] as never)
    mockFs.readFileSync.mockReturnValue(EXAMPLE_MD as never)
    mockSupabase({ data: null, error: { message: 'DB error' } })

    const result = await syncElioLabAgents()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
