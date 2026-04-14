import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOnboardingTour } from './use-onboarding-tour'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('useOnboardingTour', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  it('starts with tour inactive at step 0', () => {
    const { result } = renderHook(() => useOnboardingTour())
    expect(result.current.isActive).toBe(false)
    expect(result.current.currentStep).toBe(0)
  })

  it('startTour activates the tour at step 0', () => {
    const { result } = renderHook(() => useOnboardingTour())

    act(() => {
      result.current.startTour()
    })

    expect(result.current.isActive).toBe(true)
    expect(result.current.currentStep).toBe(0)
  })

  it('stopTour deactivates the tour and resets step', () => {
    const { result } = renderHook(() => useOnboardingTour())

    act(() => {
      result.current.startTour()
    })

    act(() => {
      result.current.nextStep()
      result.current.nextStep()
    })

    act(() => {
      result.current.stopTour()
    })

    expect(result.current.isActive).toBe(false)
    expect(result.current.currentStep).toBe(0)
  })

  it('nextStep increments the current step', () => {
    const { result } = renderHook(() => useOnboardingTour())

    act(() => {
      result.current.startTour()
    })

    act(() => {
      result.current.nextStep()
    })

    expect(result.current.currentStep).toBe(1)

    act(() => {
      result.current.nextStep()
    })

    expect(result.current.currentStep).toBe(2)
  })

  it('previousStep decrements the current step', () => {
    const { result } = renderHook(() => useOnboardingTour())

    act(() => {
      result.current.startTour()
      result.current.nextStep()
      result.current.nextStep()
    })

    act(() => {
      result.current.previousStep()
    })

    expect(result.current.currentStep).toBe(1)
  })

  it('previousStep does not go below 0', () => {
    const { result } = renderHook(() => useOnboardingTour())

    act(() => {
      result.current.startTour()
    })

    act(() => {
      result.current.previousStep()
    })

    expect(result.current.currentStep).toBe(0)
  })

  it('setStep jumps to a specific step', () => {
    const { result } = renderHook(() => useOnboardingTour())

    act(() => {
      result.current.startTour()
    })

    act(() => {
      result.current.setStep(3)
    })

    expect(result.current.currentStep).toBe(3)
  })

  it('markCompleted stores completion in localStorage', () => {
    const { result } = renderHook(() => useOnboardingTour())

    act(() => {
      result.current.markCompleted()
    })

    expect(localStorageMock.setItem).toHaveBeenCalledWith('monprojetpro-onboarding-tour-completed', 'true')
  })

  it('hasCompletedTour returns false when not completed', () => {
    const { result } = renderHook(() => useOnboardingTour())

    expect(result.current.hasCompletedTour()).toBe(false)
  })

  it('hasCompletedTour returns true after markCompleted', () => {
    localStorageMock.getItem.mockReturnValue('true')
    const { result } = renderHook(() => useOnboardingTour())

    expect(result.current.hasCompletedTour()).toBe(true)
  })

  it('nextStep does not exceed max steps', () => {
    const { result } = renderHook(() => useOnboardingTour())

    act(() => {
      result.current.startTour()
    })

    // Navigate to last step (4) and try to go beyond
    act(() => {
      result.current.setStep(4)
    })

    act(() => {
      result.current.nextStep()
    })

    // Should remain at step 4 (max is 5 steps, 0-indexed = 4)
    expect(result.current.currentStep).toBe(4)
  })
})
