import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

import { exportLabChats } from './export-lab-chats'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('exportLabChats', () => {
  it('exports Lab conversations as Markdown transcripts', async () => {
    // clients.select().eq().single()
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { auth_user_id: 'user-uuid-123' },
        error: null,
      }),
    })

    // elio_conversations.select().eq().eq().order().limit()
    const convEq2 = vi.fn().mockReturnThis()
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: convEq2,
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [{ id: 'conv-1', title: 'Mon premier brief', created_at: '2026-03-01T10:00:00Z' }],
            error: null,
          }),
        })),
      })),
    })

    // elio_messages.select().eq().order().limit()
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({
              data: [
                { role: 'user', content: 'Bonjour Élio', created_at: '2026-03-01T10:01:00Z' },
                { role: 'assistant', content: 'Comment puis-je vous aider ?', created_at: '2026-03-01T10:01:05Z' },
              ],
              error: null,
            }),
          })),
        })),
      })),
    })

    const result = await exportLabChats('client-1')

    expect(result.data).toBeTruthy()
    expect(result.data!.count).toBe(1)
    expect(result.data!.chats[0].content).toContain('Mon premier brief')
    expect(result.data!.chats[0].content).toContain('Bonjour Élio')
  })

  it('returns empty for client with no auth_user_id', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { auth_user_id: null },
        error: null,
      }),
    })

    const result = await exportLabChats('client-1')

    expect(result.data!.count).toBe(0)
  })

  it('returns empty for client with no conversations', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { auth_user_id: 'user-123' },
        error: null,
      }),
    })

    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    })

    const result = await exportLabChats('client-1')

    expect(result.data!.count).toBe(0)
  })
})
