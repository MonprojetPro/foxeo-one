import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AbandonParcoursDialog } from './abandon-parcours-dialog'

// --- Mocks ---

const mockRequestAbandonment = vi.fn()
const mockInvalidateQueries = vi.fn()

vi.mock('../actions/request-abandonment', () => ({
  requestParcoursAbandonment: (...args: unknown[]) => mockRequestAbandonment(...args),
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
      <div data-testid="dialog-content">{children}</div>,
    DialogHeader: ({ children }: { children: React.ReactNode }) =>
      <div>{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) =>
      <h2>{children}</h2>,
    DialogDescription: ({ children }: { children: React.ReactNode }) =>
      <p>{children}</p>,
    Button: ({ children, onClick, disabled, variant, ...props }: {
      children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: string
    } & Record<string, unknown>) =>
      <button onClick={onClick} disabled={disabled} data-variant={variant} {...props}>{children}</button>,
    Textarea: ({ value, onChange, placeholder, ...props }: {
      value?: string; onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; placeholder?: string
    } & Record<string, unknown>) =>
      <textarea value={value} onChange={onChange} placeholder={placeholder} {...props} />,
  }
})

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}))

const CLIENT_ID = '11111111-1111-1111-1111-111111111111'

describe('AbandonParcoursDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequestAbandonment.mockResolvedValue({ data: undefined, error: null })
    mockInvalidateQueries.mockResolvedValue(undefined)
  })

  it('renders dialog with warning message when open', () => {
    render(
      <AbandonParcoursDialog
        clientId={CLIENT_ID}
        open={true}
        onOpenChange={vi.fn()}
        completedSteps={3}
        totalSteps={5}
      />
    )

    expect(screen.getByText(/quitter votre parcours Lab/i)).toBeDefined()
    expect(screen.getByText(/3\/5 étapes complétées/)).toBeDefined()
  })

  it('renders reassuring message about data preservation', () => {
    render(
      <AbandonParcoursDialog
        clientId={CLIENT_ID}
        open={true}
        onOpenChange={vi.fn()}
        completedSteps={0}
        totalSteps={5}
      />
    )

    expect(screen.getByText(/Vos données et documents seront conservés/)).toBeDefined()
  })

  it('renders reason suggestions as clickable options', () => {
    render(
      <AbandonParcoursDialog
        clientId={CLIENT_ID}
        open={true}
        onOpenChange={vi.fn()}
        completedSteps={2}
        totalSteps={5}
      />
    )

    expect(screen.getByText(/plus le temps/i)).toBeDefined()
    expect(screen.getByText(/ne correspond pas/i)).toBeDefined()
    expect(screen.getByText(/autre solution/i)).toBeDefined()
    expect(screen.getByText(/Autre raison/i)).toBeDefined()
  })

  it('accepts optional reason and calls requestParcoursAbandonment', async () => {
    const onOpenChange = vi.fn()
    render(
      <AbandonParcoursDialog
        clientId={CLIENT_ID}
        open={true}
        onOpenChange={onOpenChange}
        completedSteps={2}
        totalSteps={5}
      />
    )

    // Click confirm button
    const confirmButton = screen.getByText(/Confirmer l'abandon/i)
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockRequestAbandonment).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: CLIENT_ID })
      )
    })
  })

  it('shows error toast when action fails', async () => {
    const { showError } = await import('@monprojetpro/ui')
    mockRequestAbandonment.mockResolvedValue({
      data: null,
      error: { message: 'DB Error', code: 'DATABASE_ERROR' },
    })

    render(
      <AbandonParcoursDialog
        clientId={CLIENT_ID}
        open={true}
        onOpenChange={vi.fn()}
        completedSteps={2}
        totalSteps={5}
      />
    )

    fireEvent.click(screen.getByText(/Confirmer l'abandon/i))

    await waitFor(() => {
      expect(showError).toHaveBeenCalled()
    })
  })

  it('does not render when open is false', () => {
    render(
      <AbandonParcoursDialog
        clientId={CLIENT_ID}
        open={false}
        onOpenChange={vi.fn()}
        completedSteps={2}
        totalSteps={5}
      />
    )

    expect(screen.queryByTestId('dialog')).toBeNull()
  })

  it('renders both confirm and cancel buttons', () => {
    render(
      <AbandonParcoursDialog
        clientId={CLIENT_ID}
        open={true}
        onOpenChange={vi.fn()}
        completedSteps={2}
        totalSteps={5}
      />
    )

    expect(screen.getByText(/Confirmer l'abandon/i)).toBeDefined()
    expect(screen.getByText(/Continuer mon parcours/i)).toBeDefined()
  })

  it('uses outline variant for cancel button', () => {
    render(
      <AbandonParcoursDialog
        clientId={CLIENT_ID}
        open={true}
        onOpenChange={vi.fn()}
        completedSteps={2}
        totalSteps={5}
      />
    )

    const cancelButton = screen.getByText(/Continuer mon parcours/i)
    expect(cancelButton.getAttribute('data-variant')).toBe('outline')
  })

  it('submits custom reason when "Autre raison" is selected and text entered', async () => {
    render(
      <AbandonParcoursDialog
        clientId={CLIENT_ID}
        open={true}
        onOpenChange={vi.fn()}
        completedSteps={2}
        totalSteps={5}
      />
    )

    // Click "Autre raison..."
    fireEvent.click(screen.getByText(/Autre raison/i))

    // Type custom reason
    const textarea = screen.getByPlaceholderText(/Décrivez votre raison/i)
    fireEvent.change(textarea, { target: { value: 'Ma raison personnalisée' } })

    // Confirm
    fireEvent.click(screen.getByText(/Confirmer l'abandon/i))

    await waitFor(() => {
      expect(mockRequestAbandonment).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: CLIENT_ID, reason: 'Ma raison personnalisée' })
      )
    })
  })
})
