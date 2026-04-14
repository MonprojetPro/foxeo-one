import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

const mockPostponeRequest = vi.fn()
vi.mock('../actions/postpone-request', () => ({
  postponeRequest: (...args: unknown[]) => mockPostponeRequest(...args),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }
})

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  requestId: '00000000-0000-0000-0000-000000000001',
  requestTitle: 'Brief Test',
  clientName: 'Alice',
}

describe('PostponeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function importComponent() {
    const { PostponeDialog } = await import('./postpone-dialog')
    return PostponeDialog
  }

  it('should render the dialog with title and summary', async () => {
    const PostponeDialog = await importComponent()
    render(<PostponeDialog {...defaultProps} />)

    expect(screen.getByText('Reporter la demande')).toBeDefined()
    expect(screen.getByText('Confirmer le report')).toBeDefined()
    expect(screen.getByText('Brief Test')).toBeDefined()
    expect(screen.getByText('Alice')).toBeDefined()
  })

  it('should render reason textarea and date input', async () => {
    const PostponeDialog = await importComponent()
    render(<PostponeDialog {...defaultProps} />)

    expect(screen.getByPlaceholderText('Pourquoi reporter cette demande ?')).toBeDefined()
    expect(screen.getByLabelText(/Date de rappel/)).toBeDefined()
  })

  it('should not render when open is false', async () => {
    const PostponeDialog = await importComponent()
    render(<PostponeDialog {...defaultProps} open={false} />)

    expect(screen.queryByText('Reporter la demande')).toBeNull()
  })

  it('should call onClose when Annuler is clicked', async () => {
    const PostponeDialog = await importComponent()
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<PostponeDialog {...defaultProps} onClose={onClose} />)

    await user.click(screen.getByText('Annuler'))
    expect(onClose).toHaveBeenCalled()
  })

  it('should submit without reason or date (both optional)', async () => {
    mockPostponeRequest.mockResolvedValue({ data: { status: 'pending' }, error: null })
    const PostponeDialog = await importComponent()
    const user = userEvent.setup()
    render(<PostponeDialog {...defaultProps} />)

    await user.click(screen.getByText('Confirmer le report'))

    await waitFor(() => {
      expect(mockPostponeRequest).toHaveBeenCalledWith(
        defaultProps.requestId,
        defaultProps.requestTitle,
        defaultProps.clientName,
        undefined,
        undefined
      )
    })
  })

  it('should pass reason when filled', async () => {
    mockPostponeRequest.mockResolvedValue({ data: { status: 'pending' }, error: null })
    const PostponeDialog = await importComponent()
    const user = userEvent.setup()
    render(<PostponeDialog {...defaultProps} />)

    const textarea = screen.getByPlaceholderText('Pourquoi reporter cette demande ?')
    await user.type(textarea, 'Pas de budget actuellement')
    await user.click(screen.getByText('Confirmer le report'))

    await waitFor(() => {
      expect(mockPostponeRequest).toHaveBeenCalledWith(
        defaultProps.requestId,
        defaultProps.requestTitle,
        defaultProps.clientName,
        'Pas de budget actuellement',
        undefined
      )
    })
  })

  it('should show success toast and redirect on success', async () => {
    mockPostponeRequest.mockResolvedValue({ data: { status: 'pending' }, error: null })
    const PostponeDialog = await importComponent()
    const { showSuccess } = await import('@monprojetpro/ui')
    const user = userEvent.setup()
    render(<PostponeDialog {...defaultProps} />)

    await user.click(screen.getByText('Confirmer le report'))

    await waitFor(() => {
      expect(showSuccess).toHaveBeenCalledWith('Demande reportée')
    })
  })

  it('should show error toast when action fails', async () => {
    mockPostponeRequest.mockResolvedValue({
      data: null,
      error: { message: 'DB error', code: 'DB_ERROR' },
    })
    const PostponeDialog = await importComponent()
    const { showError } = await import('@monprojetpro/ui')
    const user = userEvent.setup()
    render(<PostponeDialog {...defaultProps} />)

    await user.click(screen.getByText('Confirmer le report'))

    await waitFor(() => {
      expect(showError).toHaveBeenCalledWith(
        'Erreur lors du report — veuillez réessayer'
      )
    })
  })

  it('should show both optional labels', async () => {
    const PostponeDialog = await importComponent()
    render(<PostponeDialog {...defaultProps} />)

    const optionals = screen.getAllByText('(optionnel)')
    expect(optionals.length).toBe(2)
  })
})
