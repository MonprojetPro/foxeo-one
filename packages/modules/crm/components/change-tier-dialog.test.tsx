import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChangeTierDialog } from './change-tier-dialog'

vi.mock('../actions/change-tier', () => ({
  changeClientTier: vi.fn(async () => ({ data: null, error: null })),
}))

vi.mock('@foxeo/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@foxeo/ui')>()
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
    Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
      open ? <div data-testid="dialog">{children}</div> : null,
    DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
      <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
    ),
  }
})

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(async () => undefined),
  })),
}))

const { changeClientTier } = await import('../actions/change-tier')

describe('ChangeTierDialog', () => {
  const defaultProps = {
    clientId: 'client-1',
    clientName: 'Alice Dupont',
    currentTier: 'essentiel' as const,
    open: true,
    onOpenChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche les 3 options de tier', () => {
    render(<ChangeTierDialog {...defaultProps} />)
    expect(screen.getByText('Base')).toBeDefined()
    expect(screen.getByText('Essentiel')).toBeDefined()
    expect(screen.getByText('Agentique')).toBeDefined()
  })

  it('marque le tier actuel avec "(actuel)"', () => {
    render(<ChangeTierDialog {...defaultProps} />)
    expect(screen.getByText('(actuel)')).toBeDefined()
  })

  it('affiche le warning de downgrade si passage de agentique vers essentiel', () => {
    render(<ChangeTierDialog {...defaultProps} currentTier="agentique" />)
    // Sélectionner essentiel
    const essentielButton = screen.getAllByRole('button').find((b) =>
      b.textContent?.includes('Essentiel')
    )
    expect(essentielButton).toBeDefined()
    fireEvent.click(essentielButton!)
    expect(screen.getByText(/désactivera les fonctionnalités Elio One\+/i)).toBeDefined()
  })

  it('n\'affiche pas le warning si tier actuel n\'est pas agentique', () => {
    render(<ChangeTierDialog {...defaultProps} currentTier="essentiel" />)
    expect(screen.queryByText(/désactivera/i)).toBeNull()
  })

  it('appelle changeClientTier au clic sur Confirmer', async () => {
    render(<ChangeTierDialog {...defaultProps} currentTier="base" />)

    // Sélectionner agentique
    const agentiqueButton = screen.getAllByRole('button').find((b) =>
      b.textContent?.includes('Agentique')
    )
    fireEvent.click(agentiqueButton!)

    const confirmButton = screen.getByRole('button', { name: /confirmer/i })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(changeClientTier).toHaveBeenCalledWith({
        clientId: 'client-1',
        newTier: 'agentique',
      })
    })
  })

  it('ferme la modale et affiche un toast success après succès', async () => {
    const { showSuccess } = await import('@foxeo/ui')
    render(<ChangeTierDialog {...defaultProps} currentTier="base" />)

    const agentiqueButton = screen.getAllByRole('button').find((b) =>
      b.textContent?.includes('Agentique')
    )
    fireEvent.click(agentiqueButton!)

    const confirmButton = screen.getByRole('button', { name: /confirmer/i })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(showSuccess).toHaveBeenCalled()
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('affiche un toast d\'erreur si changeClientTier échoue', async () => {
    vi.mocked(changeClientTier).mockResolvedValueOnce({
      data: null,
      error: { message: 'Erreur DB', code: 'DATABASE_ERROR' },
    })

    const { showError } = await import('@foxeo/ui')
    render(<ChangeTierDialog {...defaultProps} currentTier="base" />)

    const agentiqueButton = screen.getAllByRole('button').find((b) =>
      b.textContent?.includes('Agentique')
    )
    fireEvent.click(agentiqueButton!)

    const confirmButton = screen.getByRole('button', { name: /confirmer/i })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(showError).toHaveBeenCalled()
    })
  })
})
