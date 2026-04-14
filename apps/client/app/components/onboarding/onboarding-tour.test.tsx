import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OnboardingTour } from './onboarding-tour'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
  })),
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock complete-onboarding action
vi.mock('../../onboarding/actions/complete-onboarding', () => ({
  completeOnboarding: vi.fn().mockResolvedValue({
    data: { clientId: 'client-123', redirectTo: '/' },
    error: null,
  }),
}))

// Mock use-onboarding-tour hook
const mockStartTour = vi.fn()
const mockStopTour = vi.fn()
const mockNextStep = vi.fn()
const mockPreviousStep = vi.fn()
const mockMarkCompleted = vi.fn()

let mockIsActive = false
let mockCurrentStep = 0

vi.mock('../../hooks/use-onboarding-tour', () => ({
  useOnboardingTour: vi.fn(() => ({
    isActive: mockIsActive,
    currentStep: mockCurrentStep,
    startTour: mockStartTour,
    stopTour: mockStopTour,
    nextStep: mockNextStep,
    previousStep: mockPreviousStep,
    markCompleted: mockMarkCompleted,
    setStep: vi.fn(),
    hasCompletedTour: vi.fn(() => false),
  })),
}))

// Mock @monprojetpro/ui Button
vi.mock('@monprojetpro/ui', () => ({
  Button: ({ children, onClick, disabled, ...props }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    [key: string]: unknown
  }) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}))

describe('OnboardingTour', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsActive = false
    mockCurrentStep = 0
  })

  it('appelle startTour au montage', () => {
    render(<OnboardingTour />)
    expect(mockStartTour).toHaveBeenCalledTimes(1)
  })

  it('ne rend rien quand le tour est inactif', () => {
    mockIsActive = false
    const { container } = render(<OnboardingTour />)
    expect(container.firstChild).toBeNull()
  })

  it('affiche le popover quand le tour est actif', () => {
    mockIsActive = true
    mockCurrentStep = 0

    render(<OnboardingTour />)

    // Premier step: Navigation
    expect(screen.getByText(/Navigation/i)).toBeInTheDocument()
    expect(screen.getByText(/Étape 1 \/ 5/i)).toBeInTheDocument()
  })

  it('affiche le bouton Suivant sur les étapes non-finales', () => {
    mockIsActive = true
    mockCurrentStep = 0

    render(<OnboardingTour />)

    expect(screen.getByRole('button', { name: /Suivant/i })).toBeInTheDocument()
  })

  it('affiche le bouton Terminer sur la dernière étape', () => {
    mockIsActive = true
    mockCurrentStep = 4 // Dernière étape (index 4 sur 5)

    render(<OnboardingTour />)

    expect(screen.getByRole('button', { name: /Terminer/i })).toBeInTheDocument()
  })

  it('le bouton Précédent est désactivé sur la première étape', () => {
    mockIsActive = true
    mockCurrentStep = 0

    render(<OnboardingTour />)

    const prevButton = screen.getByRole('button', { name: /Précédent/i })
    expect(prevButton).toBeDisabled()
  })

  it('le bouton Suivant appelle nextStep', () => {
    mockIsActive = true
    mockCurrentStep = 1

    render(<OnboardingTour />)

    const nextButton = screen.getByRole('button', { name: /Suivant/i })
    fireEvent.click(nextButton)

    expect(mockNextStep).toHaveBeenCalledTimes(1)
  })

  it('le bouton Précédent appelle previousStep', () => {
    mockIsActive = true
    mockCurrentStep = 2

    render(<OnboardingTour />)

    const prevButton = screen.getByRole('button', { name: /Précédent/i })
    fireEvent.click(prevButton)

    expect(mockPreviousStep).toHaveBeenCalledTimes(1)
  })

  it('le bouton Passer appelle markCompleted et completeOnboarding', async () => {
    const { completeOnboarding } = await import('../../onboarding/actions/complete-onboarding')
    mockIsActive = true
    mockCurrentStep = 0

    render(<OnboardingTour />)

    const skipButton = screen.getByRole('button', { name: /Passer/i })
    fireEvent.click(skipButton)

    await waitFor(() => {
      expect(mockMarkCompleted).toHaveBeenCalled()
      expect(completeOnboarding).toHaveBeenCalled()
    })
  })

  it('le bouton Terminer appelle markCompleted et completeOnboarding', async () => {
    const { completeOnboarding } = await import('../../onboarding/actions/complete-onboarding')
    mockIsActive = true
    mockCurrentStep = 4

    render(<OnboardingTour />)

    const finishButton = screen.getByRole('button', { name: /Terminer/i })
    fireEvent.click(finishButton)

    await waitFor(() => {
      expect(mockMarkCompleted).toHaveBeenCalled()
      expect(completeOnboarding).toHaveBeenCalled()
    })
  })

  it('affiche une barre de progression', () => {
    mockIsActive = true
    mockCurrentStep = 2

    const { container } = render(<OnboardingTour />)

    // La barre de progression a un style width calculé
    const progressBar = container.querySelector('[style*="width"]')
    expect(progressBar).toBeInTheDocument()
  })

  it('le tour est accessible via role=dialog', () => {
    mockIsActive = true
    mockCurrentStep = 0

    render(<OnboardingTour />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('affiche un toast de bienvenue à la fin du tour', async () => {
    const { toast } = await import('sonner')
    mockIsActive = true
    mockCurrentStep = 4

    render(<OnboardingTour />)

    const finishButton = screen.getByRole('button', { name: /Terminer/i })
    fireEvent.click(finishButton)

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Bienvenue dans votre espace Lab !')
    })
  })

  it('en mode restart, ne appelle pas completeOnboarding', async () => {
    const { completeOnboarding } = await import('../../onboarding/actions/complete-onboarding')
    const { toast } = await import('sonner')
    mockIsActive = true
    mockCurrentStep = 4

    render(<OnboardingTour isRestart />)

    const finishButton = screen.getByRole('button', { name: /Terminer/i })
    fireEvent.click(finishButton)

    await waitFor(() => {
      expect(mockMarkCompleted).toHaveBeenCalled()
      expect(completeOnboarding).not.toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('Bienvenue dans votre espace Lab !')
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })
})
