import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const mockSend = vi.fn().mockResolvedValue(undefined)
const mockSubscribe = vi.fn().mockReturnThis()
const mockOn = vi.fn().mockReturnThis()
const mockRemoveChannel = vi.fn()

const mockChannel = {
  on: mockOn,
  subscribe: mockSubscribe,
  send: mockSend,
}

vi.mock('@monprojetpro/supabase', () => ({
  createBrowserSupabaseClient: vi.fn(() => ({
    channel: vi.fn(() => mockChannel),
    removeChannel: mockRemoveChannel,
  })),
}))

describe('useMeetingRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('subscribes to meeting channel with correct events', async () => {
    const { useMeetingRealtime } = await import('./use-meeting-realtime')
    renderHook(() => useMeetingRealtime('meeting-123'))

    expect(mockOn).toHaveBeenCalledWith('broadcast', { event: 'operator_joined' }, expect.any(Function))
    expect(mockOn).toHaveBeenCalledWith('broadcast', { event: 'client_waiting' }, expect.any(Function))
    expect(mockSubscribe).toHaveBeenCalled()
  })

  it('initializes with operatorJoined=false and clientWaiting=false', async () => {
    const { useMeetingRealtime } = await import('./use-meeting-realtime')
    const { result } = renderHook(() => useMeetingRealtime('meeting-123'))

    expect(result.current.operatorJoined).toBe(false)
    expect(result.current.clientWaiting).toBe(false)
  })

  it('returns broadcastClientWaiting function', async () => {
    const { useMeetingRealtime } = await import('./use-meeting-realtime')
    const { result } = renderHook(() => useMeetingRealtime('meeting-123'))

    expect(typeof result.current.broadcastClientWaiting).toBe('function')
  })

  it('returns broadcastOperatorJoined function', async () => {
    const { useMeetingRealtime } = await import('./use-meeting-realtime')
    const { result } = renderHook(() => useMeetingRealtime('meeting-123'))

    expect(typeof result.current.broadcastOperatorJoined).toBe('function')
  })

  it('broadcastClientWaiting sends broadcast event', async () => {
    const { useMeetingRealtime } = await import('./use-meeting-realtime')
    const { result } = renderHook(() => useMeetingRealtime('meeting-123'))

    await act(async () => {
      await result.current.broadcastClientWaiting()
    })

    expect(mockSend).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'client_waiting',
      payload: expect.objectContaining({ timestamp: expect.any(String) }),
    })
  })

  it('cleans up channel on unmount', async () => {
    const { useMeetingRealtime } = await import('./use-meeting-realtime')
    const { unmount } = renderHook(() => useMeetingRealtime('meeting-123'))

    unmount()
    expect(mockRemoveChannel).toHaveBeenCalled()
  })
})
