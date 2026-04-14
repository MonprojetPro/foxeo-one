import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReactivateParcoursDialog } from './reactivate-parcours-dialog'

const mockReactivate = vi.fn()
const mockInvalidateQueries = vi.fn()

vi.mock('../../parcours/actions/reactivate-parcours', () => ({
  reactivateParcours: (...args: unknown[]) => mockReactivate(...args),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
    Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
      open ? <div data-testid="dialog">{children}</div> : null,
    DialogContent: ({ children }: { children: React.ReactNode }) =>
      <div>{children}</div>,
    DialogHeader: ({ children }: { children: React.ReactNode }) =>
      <div>{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) =>
      <h2>{children}</h2>,
    DialogDescription: ({ children }: { children: React.ReactNode }) =>
      <p>{children}</p>,
    Button: ({ children, onClick, disabled, ...props }: {
      children: React.ReactNode; onClick?: () => void; disabled?: boolean
    } & Record<string, unknown>) =>
      <button onClick={onClick} disabled={disabled} {...props}>{children}</button>,
  }
})

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}))

const CLIENT_ID = '11111111-1111-1111-1111-111111111111'

describe('ReactivateParcoursDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReactivate.mockResolvedValue({ data: undefined, error: null })
    mockInvalidateQueries.mockResolvedValue(undefined)
  })

  it('renders confirmation dialog when open', () => {
    render(
      <ReactivateParcoursDialog
        clientId={CLIENT_ID}
        clientName="Test Client"
        open={true}
        onOpenChange={vi.fn()}
      />
    )

    expect(screen.getByText(/Réactiver le parcours de Test Client/)).toBeDefined()
    expect(screen.getByText(/retrouvera accès à son parcours Lab/)).toBeDefined()
  })

  it('calls reactivateParcours on confirm', async () => {
    render(
      <ReactivateParcoursDialog
        clientId={CLIENT_ID}
        clientName="Test Client"
        open={true}
        onOpenChange={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText(/Réactiver le parcours$/))

    await waitFor(() => {
      expect(mockReactivate).toHaveBeenCalledWith({ clientId: CLIENT_ID })
    })
  })

  it('shows error toast on failure', async () => {
    const { showError } = await import('@monprojetpro/ui')
    mockReactivate.mockResolvedValue({
      data: null,
      error: { message: 'Not found', code: 'NOT_FOUND' },
    })

    render(
      <ReactivateParcoursDialog
        clientId={CLIENT_ID}
        clientName="Test Client"
        open={true}
        onOpenChange={vi.fn()}
      />
    )

    fireEvent.click(screen.getByText(/Réactiver le parcours$/))

    await waitFor(() => {
      expect(showError).toHaveBeenCalled()
    })
  })

  it('does not render when closed', () => {
    render(
      <ReactivateParcoursDialog
        clientId={CLIENT_ID}
        clientName="Test Client"
        open={false}
        onOpenChange={vi.fn()}
      />
    )

    expect(screen.queryByTestId('dialog')).toBeNull()
  })
})
