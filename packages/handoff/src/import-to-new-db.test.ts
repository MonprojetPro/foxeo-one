import { describe, it, expect, vi } from 'vitest'
import { importToNewDb } from './import-to-new-db'
import type { ExtractedData } from './extract-client-data'

function createMockTargetSupabase(insertError?: string) {
  return {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({
        error: insertError ? { message: insertError } : null,
      })),
      select: vi.fn(() => ({
        count: 'exact',
        head: true,
      })),
    })),
  } as any
}

describe('importToNewDb', () => {
  it('imports data successfully into target DB', async () => {
    const extractedData: ExtractedData = {
      tables: {
        clients: [{ id: 'c1', name: 'Test' }],
        client_configs: [{ client_id: 'c1' }],
      },
      counts: { clients: 1, client_configs: 1 },
    }

    // Mock that also handles integrity check
    const mockFrom = vi.fn((table: string) => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
      select: vi.fn(() => ({
        count: extractedData.counts[table] ?? 0,
        error: null,
      })),
    }))

    const targetSupabase = { from: mockFrom } as any
    const result = await importToNewDb(targetSupabase, extractedData)

    expect(result.success).toBe(true)
    expect(result.data?.importedCounts.clients).toBe(1)
  })

  it('returns error when insert fails', async () => {
    const extractedData: ExtractedData = {
      tables: {
        clients: [{ id: 'c1' }],
      },
      counts: { clients: 1 },
    }

    const targetSupabase = createMockTargetSupabase('Insert failed: duplicate key')
    const result = await importToNewDb(targetSupabase, extractedData)

    expect(result.success).toBe(false)
    expect(result.error).toContain('duplicate key')
  })

  it('skips empty tables', async () => {
    const extractedData: ExtractedData = {
      tables: {
        clients: [{ id: 'c1' }],
        client_configs: [],
      },
      counts: { clients: 1, client_configs: 0 },
    }

    const mockFrom = vi.fn((table: string) => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
      select: vi.fn(() => ({
        count: extractedData.counts[table] ?? 0,
        error: null,
      })),
    }))

    const targetSupabase = { from: mockFrom } as any
    const result = await importToNewDb(targetSupabase, extractedData)

    expect(result.success).toBe(true)
    expect(result.data?.importedCounts.client_configs).toBe(0)
  })
})
