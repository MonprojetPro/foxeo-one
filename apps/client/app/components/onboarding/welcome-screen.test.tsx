import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WelcomeScreen } from './welcome-screen'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock complete-onboarding action
vi.mock('../../onboarding/actions/complete-onboarding', () => ({
  completeOnboarding: vi.fn().mockResolvedValue({
    data: { clientId: 'client-123', redirectTo: '/' },
    error: null,
  }),
}))

// Mock @monprojetpro/ui Button
vi.mock('@monprojetpro/ui', () => ({
  Button: ({ children, asChild, onClick, disabled, ...props }: {
    children: React.ReactNode
    asChild?: boolean
    onClick?: () => void
    disabled?: boolean
    [key: string]: unknown
  }) => {
    if (asChild) {
      return <span {...props}>{children}</span>
    }
    return (
      <button onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    )
  },
}))

describe('WelcomeScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche le prénom du client dans le message de bienvenue', () => {
    render(<WelcomeScreen firstName="Sophie" />)
    expect(screen.getByText(/Bienvenue Sophie/i)).toBeInTheDocument()
  })

  it('affiche les 3 points clés du parcours Lab', () => {
    render(<WelcomeScreen firstName="Test" />)
    expect(screen.getByText(/Parcours guidé/i)).toBeInTheDocument()
    expect(screen.getByText(/Élio, votre assistant/i)).toBeInTheDocument()
    expect(screen.getByText(/Accompagnement MiKL/i)).toBeInTheDocument()
  })

  it('affiche le bouton CTA pour commencer le tutoriel', () => {
    render(<WelcomeScreen firstName="Test" />)
    const tourLink = screen.getByRole('link', { name: /Commencer le tutoriel/i })
    expect(tourLink).toBeInTheDocument()
    expect(tourLink.getAttribute('href')).toBe('/onboarding/tour')
  })

  it('affiche le bouton pour passer le tutoriel', () => {
    render(<WelcomeScreen firstName="Test" />)
    expect(screen.getByRole('button', { name: /Passer le tutoriel/i })).toBeInTheDocument()
  })

  it('le bouton "Passer" appelle completeOnboarding au clic', async () => {
    const { completeOnboarding } = await import('../../onboarding/actions/complete-onboarding')

    render(<WelcomeScreen firstName="Test" />)
    const skipButton = screen.getByRole('button', { name: /Passer le tutoriel/i })

    fireEvent.click(skipButton)

    await waitFor(() => {
      expect(completeOnboarding).toHaveBeenCalledTimes(1)
    })
  })

  it('affiche un toast de bienvenue quand on passe le tutoriel', async () => {
    const { toast } = await import('sonner')

    render(<WelcomeScreen firstName="Test" />)
    const skipButton = screen.getByRole('button', { name: /Passer le tutoriel/i })

    fireEvent.click(skipButton)

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Bienvenue dans votre espace Lab !')
    })
  })
})
