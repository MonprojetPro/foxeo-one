import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const mockInvalidateQueries = vi.fn()
const mockRemoveChannel = vi.fn()
const mockChannelFn = vi.fn()

let broadcastHandler: ((payload: unknown) => void) | null = null
let subscribeStatusHandler: ((status: string, err?: unknown) => void) | null = null

const mockOn = vi.fn().mockImplementation((event: string, config: unknown, handler?: unknown) => {
  if (event === 'broadcast') {
    broadcastHandler = handler as (payload: unknown) => void
  }
  return { on: mockOn, subscribe: mockSubscribeFn }
})

const mockSubscribeFn = vi.fn().mockImplementation((handler?: unknown) => {
  subscribeStatusHandler = handler as (status: string, err?: unknown) => void
  return { on: mockOn, subscribe: mockSubscribeFn }
})

const mockChannel = { on: mockOn, subscribe: mockSubscribeFn }

vi.mock('@monprojetpro/supabase', () => ({
  createBrowserSupabaseClient: vi.fn(() => ({
    channel: mockChannelFn,
    removeChannel: mockRemoveChannel,
  })),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidateQueries })),
}))

describe('useDocumentsRealtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    broadcastHandler = null
    subscribeStatusHandler = null
    mockChannelFn.mockReturnValue(mockChannel)
  })

  it('ne fait rien quand clientId est vide', async () => {
    const { useDocumentsRealtime } = await import('./use-documents-realtime')
    const { createBrowserSupabaseClient } = await import('@monprojetpro/supabase')
    renderHook(() => useDocumentsRealtime(''))
    expect(createBrowserSupabaseClient).not.toHaveBeenCalled()
  })

  it('crée le canal documents:<clientId>', async () => {
    const { useDocumentsRealtime } = await import('./use-documents-realtime')
    renderHook(() => useDocumentsRealtime('client-1'))
    expect(mockChannelFn).toHaveBeenCalledWith('documents:client-1')
  })

  it('s\'abonne à l\'event broadcast documents_changed', async () => {
    const { useDocumentsRealtime } = await import('./use-documents-realtime')
    renderHook(() => useDocumentsRealtime('client-1'))
    expect(mockOn).toHaveBeenCalledWith(
      'broadcast',
      expect.objectContaining({ event: 'documents_changed' }),
      expect.any(Function)
    )
  })

  it('au broadcast : invalide les caches documents et all-documents', async () => {
    const { useDocumentsRealtime } = await import('./use-documents-realtime')
    renderHook(() => useDocumentsRealtime('client-1'))
    broadcastHandler?.({ event: 'documents_changed', payload: { op: 'UPDATE' } })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['documents', 'client-1'] })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['all-documents'] })
  })

  it('au statut SUBSCRIBED : rattrape via une invalidation', async () => {
    const { useDocumentsRealtime } = await import('./use-documents-realtime')
    renderHook(() => useDocumentsRealtime('client-1'))
    subscribeStatusHandler?.('SUBSCRIBED')
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['documents', 'client-1'] })
  })

  it('au statut CHANNEL_ERROR : log une erreur', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { useDocumentsRealtime } = await import('./use-documents-realtime')
    renderHook(() => useDocumentsRealtime('client-1'))
    subscribeStatusHandler?.('CHANNEL_ERROR', new Error('test'))
    expect(consoleSpy).toHaveBeenCalledWith('[DOCUMENTS:REALTIME] Channel error:', expect.any(Error))
    consoleSpy.mockRestore()
  })

  it('au retour en ligne (online) : invalide les caches', async () => {
    const { useDocumentsRealtime } = await import('./use-documents-realtime')
    renderHook(() => useDocumentsRealtime('client-1'))
    window.dispatchEvent(new Event('online'))
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['documents', 'client-1'] })
  })

  it('nettoie le canal et le listener online au démontage', async () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const { useDocumentsRealtime } = await import('./use-documents-realtime')
    const { unmount } = renderHook(() => useDocumentsRealtime('client-1'))
    unmount()
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1)
    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
    removeEventListenerSpy.mockRestore()
  })
})
