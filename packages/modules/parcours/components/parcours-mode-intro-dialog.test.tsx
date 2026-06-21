import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ParcoursModeIntroDialog } from './parcours-mode-intro-dialog'

// Dialog stub : rend le contenu quand open=true.
vi.mock('@monprojetpro/ui', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'

describe('ParcoursModeIntroDialog', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('s’affiche à la première découverte et explique le mode libre', () => {
    render(<ParcoursModeIntroDialog clientId={CLIENT_ID} mode="libre" clientFirstName="Léa" />)
    expect(screen.getByTestId('dialog')).toBeInTheDocument()
    expect(screen.getByText(/mode libre/i)).toBeInTheDocument()
    // Le message clé : finaliser/valider pour que le lien se fasse entre étapes
    expect(screen.getByText(/fais valider tes étapes/i)).toBeInTheDocument()
    expect(screen.getByText(/Bonjour, Léa/)).toBeInTheDocument()
  })

  it('explique le mode tracé (étape par étape)', () => {
    render(<ParcoursModeIntroDialog clientId={CLIENT_ID} mode="tracee" />)
    expect(screen.getByText(/étape par étape/i)).toBeInTheDocument()
  })

  it('ne s’affiche plus une fois marqué comme vu (même mode)', () => {
    window.localStorage.setItem(`mpp:parcours-intro:${CLIENT_ID}:libre`, '1')
    render(<ParcoursModeIntroDialog clientId={CLIENT_ID} mode="libre" />)
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
  })

  it('se ré-affiche si le mode change (clé différente)', () => {
    window.localStorage.setItem(`mpp:parcours-intro:${CLIENT_ID}:tracee`, '1')
    render(<ParcoursModeIntroDialog clientId={CLIENT_ID} mode="libre" />)
    expect(screen.getByTestId('dialog')).toBeInTheDocument()
  })

  it('mémorise « vu » au clic sur « J’ai compris »', async () => {
    const user = userEvent.setup()
    render(<ParcoursModeIntroDialog clientId={CLIENT_ID} mode="libre" />)
    await user.click(screen.getByRole('button', { name: /j’ai compris/i }))
    expect(window.localStorage.getItem(`mpp:parcours-intro:${CLIENT_ID}:libre`)).toBe('1')
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
  })
})
