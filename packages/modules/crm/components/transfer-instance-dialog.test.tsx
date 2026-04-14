import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TransferInstanceDialog } from './transfer-instance-dialog'

const mockTransferInstanceToClient = vi.fn()

vi.mock('@monprojetpro/module-admin', () => ({
  transferInstanceToClient: (...args: unknown[]) => mockTransferInstanceToClient(...args),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }
})

const mockInvalidateQueries = vi.fn()
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  }
})

const defaultProps = {
  clientId: '550e8400-e29b-41d4-a716-446655440001',
  clientName: 'Jean Dupont',
  clientEmail: 'jean.dupont@example.com',
  open: true,
  onOpenChange: vi.fn(),
}

describe('TransferInstanceDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render dialog with title and warning', () => {
    render(<TransferInstanceDialog {...defaultProps} />)

    expect(screen.getByText('Transférer l\'instance One au client')).toBeDefined()
    expect(screen.getAllByText(/irréversible/i).length).toBeGreaterThanOrEqual(1)
  })

  it('should pre-fill email with client email', () => {
    render(<TransferInstanceDialog {...defaultProps} />)

    const emailInput = screen.getByTestId('recipient-email-input') as HTMLInputElement
    expect(emailInput.value).toBe('jean.dupont@example.com')
  })

  it('should render checklist with 3 items', () => {
    render(<TransferInstanceDialog {...defaultProps} />)

    expect(screen.getByText(/Factures soldées/i)).toBeDefined()
    expect(screen.getByText(/Documents stratégiques finalisés/i)).toBeDefined()
    expect(screen.getByText(/Export RGPD/i)).toBeDefined()
  })

  it('should render confirmation checkbox', () => {
    render(<TransferInstanceDialog {...defaultProps} />)

    const confirmCheckbox = screen.getByTestId('confirm-ownership-checkbox')
    expect(confirmCheckbox).toBeDefined()
  })

  it('should have confirm button disabled when confirmation checkbox is not checked', () => {
    render(<TransferInstanceDialog {...defaultProps} />)

    const confirmBtn = screen.getByTestId('confirm-transfer-button')
    expect(confirmBtn).toHaveProperty('disabled', true)
  })

  it('should enable confirm button when confirmation checkbox is checked', () => {
    render(<TransferInstanceDialog {...defaultProps} />)

    const checkbox = screen.getByTestId('confirm-ownership-checkbox')
    fireEvent.click(checkbox)

    const confirmBtn = screen.getByTestId('confirm-transfer-button')
    expect(confirmBtn).toHaveProperty('disabled', false)
  })

  it('should call transferInstanceToClient on confirm', async () => {
    mockTransferInstanceToClient.mockResolvedValue({
      data: { transferId: 'transfer-123' },
      error: null,
    })

    render(<TransferInstanceDialog {...defaultProps} />)

    const checkbox = screen.getByTestId('confirm-ownership-checkbox')
    fireEvent.click(checkbox)

    const confirmBtn = screen.getByTestId('confirm-transfer-button')
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(mockTransferInstanceToClient).toHaveBeenCalledWith({
        clientId: defaultProps.clientId,
        recipientEmail: 'jean.dupont@example.com',
      })
    })
  })

  it('should show success toast on successful transfer', async () => {
    const { showSuccess } = await import('@monprojetpro/ui')
    mockTransferInstanceToClient.mockResolvedValue({
      data: { transferId: 'transfer-123' },
      error: null,
    })

    render(<TransferInstanceDialog {...defaultProps} />)

    const checkbox = screen.getByTestId('confirm-ownership-checkbox')
    fireEvent.click(checkbox)

    const confirmBtn = screen.getByTestId('confirm-transfer-button')
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(showSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Transfert lancé')
      )
    })
  })

  it('should show error toast on failed transfer', async () => {
    const { showError } = await import('@monprojetpro/ui')
    mockTransferInstanceToClient.mockResolvedValue({
      data: null,
      error: { message: 'Erreur serveur', code: 'INTERNAL_ERROR' },
    })

    render(<TransferInstanceDialog {...defaultProps} />)

    const checkbox = screen.getByTestId('confirm-ownership-checkbox')
    fireEvent.click(checkbox)

    const confirmBtn = screen.getByTestId('confirm-transfer-button')
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(showError).toHaveBeenCalledWith('Erreur serveur')
    })
  })

  it('should call onOpenChange(false) on cancel', () => {
    render(<TransferInstanceDialog {...defaultProps} />)

    const cancelBtn = screen.getByTestId('cancel-transfer-button')
    fireEvent.click(cancelBtn)

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })
})
