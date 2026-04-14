import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGraduationTour } from './use-graduation-tour'

const GRADUATION_TOUR_KEY = 'monprojetpro-graduation-tour-completed'

describe('useGraduationTour', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('initialize with isActive=false and currentStep=0', () => {
    const { result } = renderHook(() => useGraduationTour())
    expect(result.current.isActive).toBe(false)
    expect(result.current.currentStep).toBe(0)
  })

  it('startTour sets isActive to true', () => {
    const { result } = renderHook(() => useGraduationTour())
    act(() => { result.current.startTour() })
    expect(result.current.isActive).toBe(true)
    expect(result.current.currentStep).toBe(0)
  })

  it('stopTour sets isActive to false and resets step', () => {
    const { result } = renderHook(() => useGraduationTour())
    act(() => { result.current.startTour() })
    act(() => { result.current.nextStep() })
    act(() => { result.current.stopTour() })
    expect(result.current.isActive).toBe(false)
    expect(result.current.currentStep).toBe(0)
  })

  it('nextStep increments currentStep', () => {
    const { result } = renderHook(() => useGraduationTour())
    act(() => { result.current.startTour() })
    act(() => { result.current.nextStep() })
    expect(result.current.currentStep).toBe(1)
  })

  it('nextStep does not exceed TOUR_MAX_STEPS - 1', () => {
    const { result } = renderHook(() => useGraduationTour())
    act(() => { result.current.startTour() })
    // Go to max
    for (let i = 0; i < 10; i++) {
      act(() => { result.current.nextStep() })
    }
    expect(result.current.currentStep).toBe(4) // TOUR_MAX_STEPS - 1 = 4
  })

  it('previousStep decrements currentStep', () => {
    const { result } = renderHook(() => useGraduationTour())
    act(() => { result.current.startTour() })
    act(() => { result.current.nextStep() })
    act(() => { result.current.nextStep() })
    act(() => { result.current.previousStep() })
    expect(result.current.currentStep).toBe(1)
  })

  it('previousStep does not go below 0', () => {
    const { result } = renderHook(() => useGraduationTour())
    act(() => { result.current.startTour() })
    act(() => { result.current.previousStep() })
    expect(result.current.currentStep).toBe(0)
  })

  it('setStep sets the step directly', () => {
    const { result } = renderHook(() => useGraduationTour())
    act(() => { result.current.startTour() })
    act(() => { result.current.setStep(3) })
    expect(result.current.currentStep).toBe(3)
  })

  it('markCompleted stores key in localStorage', () => {
    const { result } = renderHook(() => useGraduationTour())
    act(() => { result.current.markCompleted() })
    expect(localStorage.getItem(GRADUATION_TOUR_KEY)).toBe('true')
  })

  it('hasCompletedTour returns false when not completed', () => {
    const { result } = renderHook(() => useGraduationTour())
    expect(result.current.hasCompletedTour()).toBe(false)
  })

  it('hasCompletedTour returns true after markCompleted', () => {
    const { result } = renderHook(() => useGraduationTour())
    act(() => { result.current.markCompleted() })
    expect(result.current.hasCompletedTour()).toBe(true)
  })
})
