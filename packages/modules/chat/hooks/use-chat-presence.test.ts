import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ---- Supabase mock ----
const mockTrack = vi.fn().mockResolvedValue(undefined)
const mockPresenceStateFn = vi.fn().mockReturnValue({})
const mockSubscribe = vi.fn()
const mockRemoveChannel = vi.fn()

const mockOnCallbacks: Record<string, (...args: unknown[]) => void> = {}

const mockChannel = {
  on: vi.fn().mockImplementation(
    (_type: string, _config: { event: string }, callback: (...args: unknown[]) => void) => {
      if (_type === 'presence') {
        mockOnCallbacks[_config.event] = callback
      }
      return mockChannel
    }
  ),
  subscribe: vi.fn().mockImplementation((callback: (status: string) => void) => {
    mockSubscribe(callback)
    // Immediately fire SUBSCRIBED
    callback('SUBSCRIBED')
    return mockChannel
  }),
  track: mockTrack,
  presenceState: mockPresenceStateFn,
  untrack: vi.fn().mockResolvedValue(undefined),
}

const mockChannelFn = vi.fn().mockReturnValue(mockChannel)

vi.mock('@monprojetpro/supabase', () => ({
  createClient: vi.fn(() => ({
    channel: mockChannelFn,
    removeChannel: mockRemoveChannel,
  })),
}))

const OPERATOR_ID = 'op-111'
const USER_ID = 'user-222'

describe('useChatPresence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPresenceStateFn.mockReturnValue({})
    // Re-register mock channel after clear
    mockChannel.on.mockImplementation(
      (_type: string, _config: { event: string }, callback: (...args: unknown[]) => void) => {
        if (_type === 'presence') {
          mockOnCallbacks[_config.event] = callback
        }
        return mockChannel
      }
    )
    mockChannel.subscribe.mockImplementation((callback: (status: string) => void) => {
      mockSubscribe(callback)
      callback('SUBSCRIBED')
      return mockChannel
    })
    mockChannel.track = mockTrack
    mockChannel.presenceState = mockPresenceStateFn
    mockChannelFn.mockReturnValue(mockChannel)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates channel with correct name on mount', async () => {
    const { useChatPresence } = await import('./use-chat-presence')

    renderHook(() => useChatPresence(OPERATOR_ID, USER_ID, 'operator'))

    expect(mockChannelFn).toHaveBeenCalledWith(
      `presence:operator:${OPERATOR_ID}`,
      expect.objectContaining({ config: expect.objectContaining({ presence: { key: USER_ID } }) })
    )
  })

  it('calls track with correct payload after subscribe', async () => {
    const { useChatPresence } = await import('./use-chat-presence')

    renderHook(() => useChatPresence(OPERATOR_ID, USER_ID, 'operator'))

    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: USER_ID,
        user_type: 'operator',
        online_at: expect.any(String),
      })
    )
  })

  it('updates presenceState on sync event', async () => {
    const mockState = {
      [USER_ID]: [{ user_id: USER_ID, user_type: 'operator', online_at: '2026-01-01T00:00:00Z' }],
    }
    mockPresenceStateFn.mockReturnValue(mockState)

    const { useChatPresence } = await import('./use-chat-presence')

    const { result } = renderHook(() => useChatPresence(OPERATOR_ID, USER_ID, 'operator'))

    act(() => {
      mockOnCallbacks['sync']?.()
    })

    expect(result.current.presenceState).toEqual(mockState)
  })

  it('updates presenceState on join event', async () => {
    const { useChatPresence } = await import('./use-chat-presence')

    const { result } = renderHook(() => useChatPresence(OPERATOR_ID, USER_ID, 'operator'))

    const newState = {
      'other-user': [{ user_id: 'other-user', user_type: 'client', online_at: '2026-01-01T00:00:00Z' }],
    }
    mockPresenceStateFn.mockReturnValue(newState)

    act(() => {
      mockOnCallbacks['join']?.()
    })

    expect(result.current.presenceState).toEqual(newState)
  })

  it('updates presenceState on leave event', async () => {
    const { useChatPresence } = await import('./use-chat-presence')

    const { result } = renderHook(() => useChatPresence(OPERATOR_ID, USER_ID, 'operator'))

    mockPresenceStateFn.mockReturnValue({})

    act(() => {
      mockOnCallbacks['leave']?.()
    })

    expect(result.current.presenceState).toEqual({})
  })

  it('removes channel on unmount (cleanup)', async () => {
    const { useChatPresence } = await import('./use-chat-presence')

    const { unmount } = renderHook(() => useChatPresence(OPERATOR_ID, USER_ID, 'operator'))

    unmount()

    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel)
  })

  it('does not create channel if operatorId or userId is empty', async () => {
    const { useChatPresence } = await import('./use-chat-presence')

    renderHook(() => useChatPresence('', USER_ID, 'operator'))
    expect(mockChannelFn).not.toHaveBeenCalled()

    renderHook(() => useChatPresence(OPERATOR_ID, '', 'operator'))
    expect(mockChannelFn).not.toHaveBeenCalled()
  })
})
