import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { useStepSubmissionStatus } from './use-step-submission-status'

// ─── Mock ────────────────────────────────────────────────────────────────────

const mockGetSubmissions = vi.fn()
vi.mock('../actions/get-submissions', () => ({
  getSubmissions: (...args: unknown[]) => mockGetSubmissions(...args),
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

const STEP_ID = '00000000-0000-0000-0000-000000000010'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useStepSubmissionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns hasPending false when no submissions exist', async () => {
    mockGetSubmissions.mockResolvedValue({ data: [], error: null })
    const { result } = renderHook(
      () => useStepSubmissionStatus(STEP_ID),
      { wrapper: createWrapper() }
    )
    await waitFor(() => !result.current.isLoading)
    expect(result.current.hasPending).toBe(false)
  })

  it('returns hasPending true when pending submission exists', async () => {
    mockGetSubmissions.mockResolvedValue({
      data: [{ id: 'sub-1', status: 'pending' }],
      error: null,
    })
    const { result } = renderHook(
      () => useStepSubmissionStatus(STEP_ID),
      { wrapper: createWrapper() }
    )
    await waitFor(() => expect(result.current.hasPending).toBe(true))
  })

  it('is not enabled when stepId is undefined', async () => {
    const { result } = renderHook(
      () => useStepSubmissionStatus(undefined),
      { wrapper: createWrapper() }
    )
    expect(result.current.hasPending).toBe(false)
    expect(mockGetSubmissions).not.toHaveBeenCalled()
  })

  it('queries with correct stepId and pending status', async () => {
    mockGetSubmissions.mockResolvedValue({ data: [], error: null })
    renderHook(
      () => useStepSubmissionStatus(STEP_ID),
      { wrapper: createWrapper() }
    )
    await waitFor(() => mockGetSubmissions.mock.calls.length > 0)
    expect(mockGetSubmissions).toHaveBeenCalledWith({
      stepId: STEP_ID,
      status: 'pending',
    })
  })
})
