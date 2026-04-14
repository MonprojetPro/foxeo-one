import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GraduationCelebrate } from './graduation-celebrate'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}))

vi.mock('../../graduation/actions/mark-graduation-screen-shown', () => ({
  markGraduationScreenShown: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
}))

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

const defaultProps = {
  firstName: 'Sophie',
  graduationMessage: 'Bravo pour votre parcours !',
  firstLoginAt: '2026-01-01T10:00:00Z',
  graduatedAt: '2026-02-24T10:00:00Z',
}

describe('GraduationCelebrate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock document.documentElement methods
    Object.defineProperty(document.documentElement, 'classList', {
      value: { add: vi.fn(), remove: vi.fn() },
      writable: true,
    })
    Object.defineProperty(document.documentElement, 'setAttribute', {
      value: vi.fn(),
      writable: true,
    })
  })

  it('affiche le prénom du client', () => {
    render(<GraduationCelebrate {...defaultProps} />)
    expect(screen.getByText(/Félicitations Sophie/i)).toBeInTheDocument()
  })

  it('affiche le message personnalisé de MiKL', () => {
    render(<GraduationCelebrate {...defaultProps} />)
    expect(screen.getByText(/Bravo pour votre parcours/i)).toBeInTheDocument()
  })

  it("n'affiche pas le message personnalisé quand il est null", () => {
    render(<GraduationCelebrate {...defaultProps} graduationMessage={null} />)
    expect(screen.queryByText(/MiKL, votre accompagnateur/i)).not.toBeInTheDocument()
  })

  it('affiche le bouton "Découvrir MonprojetPro One"', () => {
    render(<GraduationCelebrate {...defaultProps} />)
    expect(screen.getByRole('button', { name: /Découvrir MonprojetPro One/i })).toBeInTheDocument()
  })

  it('navigue vers /graduation/discover-one au clic "Découvrir"', async () => {
    const { useRouter } = await import('next/navigation')
    const pushMock = vi.fn()
    vi.mocked(useRouter).mockReturnValue({ push: pushMock } as any)

    render(<GraduationCelebrate {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Découvrir MonprojetPro One/i }))

    expect(pushMock).toHaveBeenCalledWith('/graduation/discover-one')
  })

  it('appelle markGraduationScreenShown au clic "Accéder directement"', async () => {
    const { markGraduationScreenShown } = await import('../../graduation/actions/mark-graduation-screen-shown')

    render(<GraduationCelebrate {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /Accéder directement/i }))

    await waitFor(() => {
      expect(markGraduationScreenShown).toHaveBeenCalledTimes(1)
    })
  })
})
