'use client'

import { useState, useCallback } from 'react'

const GRADUATION_TOUR_KEY = 'monprojetpro-graduation-tour-completed'
const TOUR_MAX_STEPS = 5

export interface GraduationTourState {
  isActive: boolean
  currentStep: number
}

export interface UseGraduationTourReturn {
  isActive: boolean
  currentStep: number
  startTour: () => void
  stopTour: () => void
  nextStep: () => void
  previousStep: () => void
  setStep: (step: number) => void
  markCompleted: () => void
  hasCompletedTour: () => boolean
}

export function useGraduationTour(): UseGraduationTourReturn {
  const [state, setState] = useState<GraduationTourState>({
    isActive: false,
    currentStep: 0,
  })

  const startTour = useCallback(() => {
    setState({ isActive: true, currentStep: 0 })
  }, [])

  const stopTour = useCallback(() => {
    setState({ isActive: false, currentStep: 0 })
  }, [])

  const nextStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(TOUR_MAX_STEPS - 1, prev.currentStep + 1),
    }))
  }, [])

  const previousStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
    }))
  }, [])

  const setStep = useCallback((step: number) => {
    setState((prev) => ({ ...prev, currentStep: step }))
  }, [])

  const markCompleted = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GRADUATION_TOUR_KEY, 'true')
    }
  }, [])

  const hasCompletedTour = useCallback(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(GRADUATION_TOUR_KEY) === 'true'
  }, [])

  return {
    isActive: state.isActive,
    currentStep: state.currentStep,
    startTour,
    stopTour,
    nextStep,
    previousStep,
    setStep,
    markCompleted,
    hasCompletedTour,
  }
}
