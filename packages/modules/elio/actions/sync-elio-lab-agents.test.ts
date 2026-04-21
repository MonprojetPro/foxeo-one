import { describe, it, expect, vi } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>()
  return {
    ...actual,
    readdir: vi.fn(),
    readFile: vi.fn(),
  }
})

vi.mock('path', async (importOriginal) => {
  const actual = await importOriginal<typeof import('path')>()
  return {
    ...actual,
    join: (...args: string[]) => args.join('/'),
  }
})

import { syncElioLabAgents } from './sync-elio-lab-agents'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { readdir, readFile } from 'fs/promises'

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
  it('retourne synced:0 si aucun fichier .md', async () => {
    vi.mocked(readdir).mockResolvedValue(['README.txt'] as never)
    mockSupabase({ data: [], error: null })

    const result = await syncElioLabAgents()
    expect(result.error).toBeNull()
    expect(result.data?.synced).toBe(0)
    expect(result.data?.agents).toHaveLength(0)
  })

  it('parse le frontmatter et fait un upsert', async () => {
    vi.mocked(readdir).mockResolvedValue(['agent-test.md'] as never)
    vi.mocked(readFile).mockResolvedValue(EXAMPLE_MD as never)

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
    vi.mocked(readdir).mockResolvedValue(['agent.md'] as never)
    vi.mocked(readFile).mockResolvedValue(EXAMPLE_MD as never)
    mockSupabase({ data: null, error: { message: 'DB error' } })

    const result = await syncElioLabAgents()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
