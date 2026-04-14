import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { toast } from '@monprojetpro/ui'
import { useUndoableAction } from './use-undo-action'

// Mock toast from @monprojetpro/ui
vi.mock('@monprojetpro/ui', async () => {
  const actual = await vi.importActual('@monprojetpro/ui')
  return {
    ...actual,
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }
})

describe('useUndoableAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should execute action and show success toast', async () => {
    const { result } = renderHook(() => useUndoableAction())

    const action = vi.fn().mockResolvedValue('result')
    const undoAction = vi.fn().mockResolvedValue(undefined)

    await act(async () => {
      await result.current.execute(action, undoAction, {
        successMessage: 'Document supprimé',
      })
    })

    expect(action).toHaveBeenCalledOnce()
    expect(toast.success).toHaveBeenCalledWith('Document supprimé', expect.any(Object))
  })

  it('should call undoAction when undo button is clicked in toast', async () => {
    const { result } = renderHook(() => useUndoableAction())

    const action = vi.fn().mockResolvedValue('result')
    const undoAction = vi.fn().mockResolvedValue(undefined)

    let capturedOnClick: (() => void) | undefined

    // Capture the onClick handler from toast.success call
    vi.mocked(toast.success).mockImplementation((message, options: any) => {
      capturedOnClick = options?.action?.onClick
      return 'toast-id'
    })

    await act(async () => {
      await result.current.execute(action, undoAction)
    })

    expect(toast.success).toHaveBeenCalled()
    expect(capturedOnClick).toBeDefined()

    // Simulate clicking the undo button
    if (capturedOnClick) {
      await act(async () => {
        await capturedOnClick()
      })
    }

    expect(undoAction).toHaveBeenCalledOnce()
    // Should show success toast for undo (second call to toast.success)
    expect(toast.success).toHaveBeenCalledWith('Annulée')
  })

  it('should not call undoAction if timer expires without undo click', async () => {
    const { result } = renderHook(() => useUndoableAction())

    const action = vi.fn().mockResolvedValue('result')
    const undoAction = vi.fn().mockResolvedValue(undefined)

    await act(async () => {
      await result.current.execute(action, undoAction, { delay: 5000 })
    })

    // Wait for timer to potentially expire (in this test, we don't simulate time passing)
    // The undo should NOT be called automatically
    expect(undoAction).not.toHaveBeenCalled()
  })

  it('should show error toast if undoAction fails', async () => {
    const { result } = renderHook(() => useUndoableAction())

    const action = vi.fn().mockResolvedValue('result')
    const undoAction = vi.fn().mockRejectedValue(new Error('Undo failed'))

    let capturedOnClick: (() => void) | undefined

    vi.mocked(toast.success).mockImplementation((message, options: any) => {
      capturedOnClick = options?.action?.onClick
      return 'toast-id'
    })

    await act(async () => {
      await result.current.execute(action, undoAction)
    })

    // Click undo button
    if (capturedOnClick) {
      await act(async () => {
        await capturedOnClick()
      })
    }

    expect(undoAction).toHaveBeenCalledOnce()
    expect(toast.error).toHaveBeenCalledWith("Impossible d'annuler l'action")
  })

  it('should show error toast if main action fails', async () => {
    const { result } = renderHook(() => useUndoableAction())

    const action = vi.fn().mockRejectedValue(new Error('Action failed'))
    const undoAction = vi.fn().mockResolvedValue(undefined)

    await act(async () => {
      try {
        await result.current.execute(action, undoAction)
      } catch {
        // Expected to throw
      }
    })

    expect(action).toHaveBeenCalledOnce()
    expect(toast.error).toHaveBeenCalledWith("Erreur lors de l'exécution de l'action")
    expect(undoAction).not.toHaveBeenCalled()
  })
})
