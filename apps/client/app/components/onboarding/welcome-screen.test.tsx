import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WelcomeScreen } from './welcome-screen'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

describe('WelcomeScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche le prénom du client dans le message de bienvenue', () => {
    render(<WelcomeScreen firstName="Sophie" variant="lab" mode="onboarding" />)
    expect(screen.getByText(/Bienvenue Sophie/i)).toBeInTheDocument()
  })

  it('variant lab : affiche le contenu Lab, dont le rôle concret d\'Élio', () => {
    render(<WelcomeScreen firstName="Test" variant="lab" mode="onboarding" />)
    expect(screen.getByText(/parcours guidé/i)).toBeInTheDocument()
    expect(screen.getByText(/copilote de création/i)).toBeInTheDocument()
    expect(screen.getByText(/Accompagnement MiKL/i)).toBeInTheDocument()
  })

  it('variant one : affiche le contenu One, distinct du Lab', () => {
    render(<WelcomeScreen firstName="Test" variant="one" mode="onboarding" />)
    expect(screen.getByText(/pilotage de vos livrables/i)).toBeInTheDocument()
    expect(screen.getByText(/extension de MiKL/i)).toBeInTheDocument()
    expect(screen.queryByText(/copilote de création/i)).not.toBeInTheDocument()
  })

  // T-078 — le parcours n'est plus "tutoriel optionnel + skip" : c'est une étape
  // obligatoire qui mène à la création du mot de passe.
  it('mode onboarding : le CTA "On y va" redirige vers la création du mot de passe', () => {
    render(<WelcomeScreen firstName="Test" variant="lab" mode="onboarding" />)
    fireEvent.click(screen.getByRole('button', { name: /on y va/i }))
    expect(pushMock).toHaveBeenCalledWith('/reset-password')
  })

  it('mode replay (depuis les réglages) : le CTA ramène simplement au dashboard', () => {
    render(<WelcomeScreen firstName="Test" variant="lab" mode="replay" />)
    fireEvent.click(screen.getByRole('button', { name: /retour à mon espace/i }))
    expect(pushMock).toHaveBeenCalledWith('/')
  })
})
