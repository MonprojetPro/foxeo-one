import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

import { exportLabBriefs } from './export-lab-briefs'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('exportLabBriefs', () => {
  it('exports briefs and generates PRD from approved ones', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'sub-1',
            submission_content: 'Objectif du projet: créer un SaaS',
            status: 'approved',
            submitted_at: '2026-03-01T10:00:00Z',
            parcours_step_id: 'step-1',
          },
          {
            id: 'sub-2',
            submission_content: 'Design UX: minimaliste',
            status: 'pending',
            submitted_at: '2026-03-05T10:00:00Z',
            parcours_step_id: 'step-2',
          },
        ],
        error: null,
      }),
    })

    const result = await exportLabBriefs('client-1')

    expect(result.data!.count).toBe(2)
    expect(result.data!.briefs).toHaveLength(2)
    expect(result.data!.prd).toBeTruthy()
    expect(result.data!.prd).toContain('PRD Consolidé')
    expect(result.data!.prd).toContain('créer un SaaS')
    expect(result.data!.prd).not.toContain('Design UX')
  })

  it('returns null PRD when no approved briefs', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          { id: 'sub-1', submission_content: 'Draft', status: 'pending', submitted_at: '2026-03-01T10:00:00Z', parcours_step_id: 'step-1' },
        ],
        error: null,
      }),
    })

    const result = await exportLabBriefs('client-1')

    expect(result.data!.count).toBe(1)
    expect(result.data!.prd).toBeNull()
  })

  it('returns empty for client with no briefs', async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    const result = await exportLabBriefs('client-1')

    expect(result.data!.count).toBe(0)
    expect(result.data!.prd).toBeNull()
  })
})
