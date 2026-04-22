import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useStepHistory } from './use-step-history'

// Mock Supabase browser client
vi.mock('@monprojetpro/supabase', () => ({
  createBrowserSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  })),
}))

vi.mock('../actions/get-submissions', () => ({
  getSubmissions: vi.fn().mockResolvedValue({ data: [], error: null }),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useStepHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty arrays when stepId is undefined', async () => {
    const { result } = renderHook(() => useStepHistory(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.submissions).toEqual([])
    expect(result.current.feedbackInjections).toEqual([])
  })

  it('fetches submissions when stepId is provided', async () => {
    const { getSubmissions } = await import('../actions/get-submissions')
    const mockGetSubmissions = vi.mocked(getSubmissions)
    mockGetSubmissions.mockResolvedValue({
      data: [
        {
          id: 'sub-1',
          parcoursStepId: 'step-1',
          clientId: 'client-1',
          submissionContent: 'Mon contenu de soumission',
          submissionFiles: [],
          submittedAt: '2026-04-01T10:00:00Z',
          status: 'pending',
          feedback: null,
          feedbackAt: null,
          createdAt: '2026-04-01T10:00:00Z',
          updatedAt: '2026-04-01T10:00:00Z',
          stepNumber: 1,
          stepTitle: 'Étape 1',
          parcoursId: 'parcours-1',
        },
      ],
      error: null,
    })

    const { result } = renderHook(() => useStepHistory('step-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoadingSubmissions).toBe(false)
    })

    expect(result.current.submissions).toHaveLength(1)
    expect(result.current.submissions[0].id).toBe('sub-1')
  })

  it('returns empty feedbackInjections when table query returns error (graceful fallback)', async () => {
    const { createBrowserSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createBrowserSupabaseClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'table not found' } }),
      })),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      })),
      removeChannel: vi.fn(),
    } as ReturnType<typeof createBrowserSupabaseClient>)

    const { result } = renderHook(() => useStepHistory('step-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoadingFeedback).toBe(false)
    })

    expect(result.current.feedbackInjections).toEqual([])
  })

  it('maps feedback injections correctly when table exists', async () => {
    const { createBrowserSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createBrowserSupabaseClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'fi-1',
              step_id: 'step-1',
              content: 'Feedback de MiKL',
              read_at: null,
              created_at: '2026-04-01T09:00:00Z',
            },
          ],
          error: null,
        }),
      })),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      })),
      removeChannel: vi.fn(),
    } as ReturnType<typeof createBrowserSupabaseClient>)

    const { result } = renderHook(() => useStepHistory('step-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoadingFeedback).toBe(false)
    })

    expect(result.current.feedbackInjections).toHaveLength(1)
    expect(result.current.feedbackInjections[0].content).toBe('Feedback de MiKL')
    expect(result.current.feedbackInjections[0].readAt).toBeNull()
  })
})
