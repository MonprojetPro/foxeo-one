import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

const mockGetMeetings = vi.fn()

vi.mock('../actions/get-meetings', () => ({
  getMeetings: mockGetMeetings,
}))

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const MEETING_ID = '00000000-0000-0000-0000-000000000003'

const mockMeeting = {
  id: MEETING_ID,
  clientId: CLIENT_ID,
  operatorId: '00000000-0000-0000-0000-000000000002',
  title: 'Test Meeting',
  description: null,
  scheduledAt: null,
  startedAt: null,
  endedAt: null,
  durationSeconds: null,
  meetSpaceName: null,
  meetUri: null,
  status: 'scheduled' as const,
  type: 'standard' as const,
  metadata: {},
  recordingUrl: null,
  transcriptUrl: null,
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-01T10:00:00.000Z',
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useMeetings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetMeetings.mockResolvedValue({ data: [mockMeeting], error: null })
  })

  it('returns meetings list on success', async () => {
    const { useMeetings } = await import('./use-meetings')
    const { result } = renderHook(() => useMeetings({}), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0]?.title).toBe('Test Meeting')
  })

  it('uses clientId in query key for isolation', async () => {
    const { useMeetings } = await import('./use-meetings')
    renderHook(() => useMeetings({ clientId: CLIENT_ID }), { wrapper: createWrapper() })

    await waitFor(() => expect(mockGetMeetings).toHaveBeenCalledWith({ clientId: CLIENT_ID }))
  })

  it('returns empty array when no meetings found', async () => {
    mockGetMeetings.mockResolvedValue({ data: [], error: null })

    const { useMeetings } = await import('./use-meetings')
    const { result } = renderHook(() => useMeetings({}), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('returns undefined data on error', async () => {
    mockGetMeetings.mockResolvedValue({ data: null, error: { message: 'Error', code: 'DB_ERROR' } })

    const { useMeetings } = await import('./use-meetings')
    const { result } = renderHook(() => useMeetings({}), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })
})
