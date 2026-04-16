import { describe, it, expect, vi } from 'vitest'
import { extractClientData, getClientTables } from './extract-client-data'

function createMockSupabase(tableData: Record<string, unknown[]> = {}) {
  return {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({
            data: tableData[table] ?? [],
            error: null,
          })),
        })),
      })),
    })),
  } as any
}

describe('extractClientData', () => {
  it('extracts data from all client tables', async () => {
    const mockData: Record<string, unknown[]> = {
      clients: [{ id: 'client-1', name: 'Test Client' }],
      client_configs: [{ client_id: 'client-1', dashboard_type: 'one' }],
      documents: [
        { id: 'doc-1', client_id: 'client-1', title: 'Brief' },
        { id: 'doc-2', client_id: 'client-1', title: 'Logo' },
      ],
    }

    const supabase = createMockSupabase(mockData)
    const result = await extractClientData(supabase, 'client-1')

    expect(result.success).toBe(true)
    expect(result.data!.counts.clients).toBe(1)
    expect(result.data!.counts.client_configs).toBe(1)
    expect(result.data!.counts.documents).toBe(2)
  })

  it('returns error when a table query fails', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({
              data: null,
              error: { message: 'RLS policy violation' },
            })),
          })),
        })),
      })),
    } as any

    const result = await extractClientData(supabase, 'client-1')

    expect(result.success).toBe(false)
    expect(result.error).toContain('RLS policy violation')
  })

  it('handles empty tables', async () => {
    const supabase = createMockSupabase({})
    const result = await extractClientData(supabase, 'client-1')

    expect(result.success).toBe(true)
    for (const table of getClientTables()) {
      expect(result.data!.counts[table]).toBe(0)
    }
  })
})

describe('getClientTables', () => {
  it('returns a non-empty list of tables', () => {
    const tables = getClientTables()
    expect(tables.length).toBeGreaterThan(10)
    expect(tables[0]).toBe('clients')
  })
})
