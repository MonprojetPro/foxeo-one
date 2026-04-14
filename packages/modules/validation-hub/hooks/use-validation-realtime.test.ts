import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const mockInvalidateQueries = vi.fn()
const mockRemoveChannel = vi.fn()
const mockChannelFn = vi.fn() // channel factory called with channel name

// Capture handlers for testing
let insertHandler: ((payload: unknown) => void) | null = null
let updateHandler: ((payload: unknown) => void) | null = null
let subscribeStatusHandler: ((status: string, err?: unknown) => void) | null = null

const mockOn = vi.fn().mockImplementation((event: string, config: unknown, handler?: unknown) => {
  if (event === 'postgres_changes') {
    const cfg = config as { event: string }
    if (cfg.event === 'INSERT') {
      insertHandler = handler as (payload: unknown) => void
    } else if (cfg.event === 'UPDATE') {
      updateHandler = handler as (payload: unknown) => void
    }
  }
  return { on: mockOn, subscribe: mockSubscribeFn }
})

const mockSubscribeFn = vi.fn().mockImplementation((handler?: unknown) => {
  subscribeStatusHandler = handler as (status: string, err?: unknown) => void
  return { on: mockOn, subscribe: mockSubscribeFn }
})

const mockChannel = {
  on: mockOn,
  subscribe: mockSubscribeFn,
}

vi.mock('@monprojetpro/supabase', () => ({
  createBrowserSupabaseClient: vi.fn(() => ({
    channel: mockChannelFn,
    removeChannel: mockRemoveChannel,
  })),
}))

const mockShowInfo = vi.fn()
vi.mock('@monprojetpro/ui', () => ({
  showInfo: vi.fn((...args) => mockShowInfo(...args)),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidateQueries })),
}))

describe('useValidationRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    insertHandler = null
    updateHandler = null
    subscribeStatusHandler = null
    mockShowInfo.mockClear()
    // Set up channel function to return mockChannel each time
    mockChannelFn.mockReturnValue(mockChannel)
  })

  it('does nothing when operatorId is empty', async () => {
    const { useValidationRealtime } = await import('./use-validation-realtime')
    const { createBrowserSupabaseClient } = await import('@monprojetpro/supabase')
    renderHook(() => useValidationRealtime(''))
    expect(createBrowserSupabaseClient).not.toHaveBeenCalled()
  })

  it('creates channel with correct name when operatorId provided', async () => {
    const { useValidationRealtime } = await import('./use-validation-realtime')
    renderHook(() => useValidationRealtime('op-123'))
    expect(mockChannelFn).toHaveBeenCalledWith('validation-requests-operator-op-123')
  })

  it('subscribes to INSERT events with operator filter', async () => {
    const { useValidationRealtime } = await import('./use-validation-realtime')
    renderHook(() => useValidationRealtime('op-123'))
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'INSERT',
        schema: 'public',
        table: 'validation_requests',
        filter: 'operator_id=eq.op-123',
      }),
      expect.any(Function)
    )
  })

  it('subscribes to UPDATE events with operator filter', async () => {
    const { useValidationRealtime } = await import('./use-validation-realtime')
    renderHook(() => useValidationRealtime('op-123'))
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'UPDATE',
        schema: 'public',
        table: 'validation_requests',
        filter: 'operator_id=eq.op-123',
      }),
      expect.any(Function)
    )
  })

  it('on INSERT: invalidates validation-requests cache and shows toast', async () => {
    const { useValidationRealtime } = await import('./use-validation-realtime')
    renderHook(() => useValidationRealtime('op-123'))

    // Simulate INSERT event
    insertHandler?.({
      new: { id: 'req-1', title: 'Brief de démarrage', status: 'pending', client_id: 'c-1' },
      old: {},
    })

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['validation-requests'] })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['validation-badge', 'op-123'] })
    expect(mockShowInfo).toHaveBeenCalledWith('Nouvelle demande : Brief de démarrage')
  })

  it('on INSERT with no title: uses fallback', async () => {
    const { useValidationRealtime } = await import('./use-validation-realtime')
    renderHook(() => useValidationRealtime('op-123'))

    insertHandler?.({ new: { id: 'req-2' }, old: {} })

    expect(mockShowInfo).toHaveBeenCalledWith('Nouvelle demande : sans titre')
  })

  it('on UPDATE: invalidates caches', async () => {
    const { useValidationRealtime } = await import('./use-validation-realtime')
    renderHook(() => useValidationRealtime('op-123'))

    updateHandler?.({
      new: { id: 'req-1', status: 'approved' },
      old: { id: 'req-1', status: 'pending' },
    })

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['validation-requests'] })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['validation-request', 'req-1'] })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['validation-badge', 'op-123'] })
  })

  it('on UPDATE needs_clarification → pending: shows re-submission toast', async () => {
    const { useValidationRealtime } = await import('./use-validation-realtime')
    renderHook(() => useValidationRealtime('op-123'))

    updateHandler?.({
      new: { id: 'req-1', status: 'pending' },
      old: { id: 'req-1', status: 'needs_clarification' },
    })

    expect(mockShowInfo).toHaveBeenCalledWith('Un client a répondu à vos précisions')
  })

  it('on UPDATE without needs_clarification transition: no toast', async () => {
    const { useValidationRealtime } = await import('./use-validation-realtime')
    renderHook(() => useValidationRealtime('op-123'))

    updateHandler?.({
      new: { id: 'req-1', status: 'approved' },
      old: { id: 'req-1', status: 'pending' },
    })

    expect(mockShowInfo).not.toHaveBeenCalled()
  })

  it('cleans up channel on unmount (AC7)', async () => {
    const { useValidationRealtime } = await import('./use-validation-realtime')
    const { unmount } = renderHook(() => useValidationRealtime('op-123'))

    unmount()
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1)
  })

  it('logs SUBSCRIBED status', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { useValidationRealtime } = await import('./use-validation-realtime')
    renderHook(() => useValidationRealtime('op-123'))

    subscribeStatusHandler?.('SUBSCRIBED')
    expect(consoleSpy).toHaveBeenCalledWith('[VALIDATION-HUB:REALTIME] Connected')
    consoleSpy.mockRestore()
  })

  it('logs CHANNEL_ERROR status', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { useValidationRealtime } = await import('./use-validation-realtime')
    renderHook(() => useValidationRealtime('op-123'))

    subscribeStatusHandler?.('CHANNEL_ERROR', new Error('test'))
    expect(consoleSpy).toHaveBeenCalledWith('[VALIDATION-HUB:REALTIME] Channel error:', expect.any(Error))
    consoleSpy.mockRestore()
  })

  it('on reconnect (online event): invalidates caches and shows toast (AC6)', async () => {
    const { useValidationRealtime } = await import('./use-validation-realtime')
    renderHook(() => useValidationRealtime('op-123'))

    // Simulate window.online event
    window.dispatchEvent(new Event('online'))

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['validation-requests'] })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['validation-badge', 'op-123'] })
    expect(mockShowInfo).toHaveBeenCalledWith('Connexion rétablie — données à jour')
  })

  it('removes online listener on unmount (AC7)', async () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const { useValidationRealtime } = await import('./use-validation-realtime')
    const { unmount } = renderHook(() => useValidationRealtime('op-123'))

    unmount()
    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
    removeEventListenerSpy.mockRestore()
  })
})
