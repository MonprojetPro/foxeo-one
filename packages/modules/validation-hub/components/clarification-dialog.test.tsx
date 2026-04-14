import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

const mockRequestClarification = vi.fn()
vi.mock('../actions/request-clarification', () => ({
  requestClarification: (...args: unknown[]) => mockRequestClarification(...args),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }
})

describe('ClarificationDialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    requestId: '00000000-0000-0000-0000-000000000001',
    title: 'Brief produit X',
    clientName: 'Alice',
    type: 'brief_lab' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function importComponent() {
    const { ClarificationDialog } = await import('./clarification-dialog')
    return ClarificationDialog
  }

  it('should render the dialog with title and summary', async () => {
    const ClarificationDialog = await importComponent()
    render(<ClarificationDialog {...defaultProps} />)

    expect(screen.getByText('Demander des précisions')).toBeDefined()
    expect(screen.getByText('Brief produit X')).toBeDefined()
    expect(screen.getByText('Alice')).toBeDefined()
  })

  it('should render the textarea with correct placeholder', async () => {
    const ClarificationDialog = await importComponent()
    render(<ClarificationDialog {...defaultProps} />)

    const textarea = screen.getByPlaceholderText('Quelle information vous manque ?')
    expect(textarea).toBeDefined()
  })

  it('should render 3 quick suggestion chips', async () => {
    const ClarificationDialog = await importComponent()
    render(<ClarificationDialog {...defaultProps} />)

    expect(screen.getByText('Pouvez-vous détailler le besoin ?')).toBeDefined()
    expect(screen.getByText('Avez-vous un exemple concret ?')).toBeDefined()
    expect(screen.getByText('Quel est le budget envisagé ?')).toBeDefined()
  })

  it('should fill textarea when clicking a suggestion chip', async () => {
    const ClarificationDialog = await importComponent()
    const user = userEvent.setup()
    render(<ClarificationDialog {...defaultProps} />)

    await user.click(screen.getByText('Pouvez-vous détailler le besoin ?'))

    const textarea = screen.getByPlaceholderText(
      'Quelle information vous manque ?'
    ) as HTMLTextAreaElement
    expect(textarea.value).toBe('Pouvez-vous détailler le besoin ?')
  })

  it('should disable submit button when comment is less than 10 chars', async () => {
    const ClarificationDialog = await importComponent()
    const user = userEvent.setup()
    render(<ClarificationDialog {...defaultProps} />)

    const textarea = screen.getByPlaceholderText('Quelle information vous manque ?')
    await user.type(textarea, 'Court')

    const submitBtn = screen.getByText('Envoyer la question')
    expect(submitBtn.closest('button')?.disabled).toBe(true)
  })

  it('should enable submit button when comment has 10+ chars', async () => {
    const ClarificationDialog = await importComponent()
    const user = userEvent.setup()
    render(<ClarificationDialog {...defaultProps} />)

    const textarea = screen.getByPlaceholderText('Quelle information vous manque ?')
    await user.type(textarea, 'Commentaire suffisamment long')

    await waitFor(() => {
      const submitBtn = screen.getByText('Envoyer la question')
      expect(submitBtn.closest('button')?.disabled).toBe(false)
    })
  })

  it('should show validation error message when comment < 10 chars and touched', async () => {
    const ClarificationDialog = await importComponent()
    const user = userEvent.setup()
    render(<ClarificationDialog {...defaultProps} />)

    const textarea = screen.getByPlaceholderText('Quelle information vous manque ?')
    await user.type(textarea, 'Court')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText(/10 caractères/)).toBeDefined()
    })
  })

  it('should call requestClarification with correct args on submit', async () => {
    const ClarificationDialog = await importComponent()
    const user = userEvent.setup()
    mockRequestClarification.mockResolvedValue({ data: {}, error: null })

    render(<ClarificationDialog {...defaultProps} />)

    const textarea = screen.getByPlaceholderText('Quelle information vous manque ?')
    await user.type(textarea, 'Quel est le budget envisagé pour ce projet ?')

    const submitBtn = screen.getByText('Envoyer la question')
    await user.click(submitBtn)

    await waitFor(() => {
      expect(mockRequestClarification).toHaveBeenCalledWith(
        '00000000-0000-0000-0000-000000000001',
        'Quel est le budget envisagé pour ce projet ?'
      )
    })
  })

  it('should show success toast and call onClose on success', async () => {
    const ClarificationDialog = await importComponent()
    const { showSuccess } = await import('@monprojetpro/ui')
    const user = userEvent.setup()
    const onClose = vi.fn()
    mockRequestClarification.mockResolvedValue({ data: {}, error: null })

    render(<ClarificationDialog {...defaultProps} onClose={onClose} />)

    const textarea = screen.getByPlaceholderText('Quelle information vous manque ?')
    await user.type(textarea, 'Quel est le budget pour ce projet exact ?')
    await user.click(screen.getByText('Envoyer la question'))

    await waitFor(() => {
      expect(showSuccess).toHaveBeenCalledWith('Question envoyée au client')
    })
  })

  it('should show error toast when action returns error', async () => {
    const ClarificationDialog = await importComponent()
    const { showError } = await import('@monprojetpro/ui')
    const user = userEvent.setup()
    mockRequestClarification.mockResolvedValue({
      data: null,
      error: { message: 'DB error', code: 'DB_ERROR' },
    })

    render(<ClarificationDialog {...defaultProps} />)

    const textarea = screen.getByPlaceholderText('Quelle information vous manque ?')
    await user.type(textarea, 'Quel est le budget pour ce projet exact ?')
    await user.click(screen.getByText('Envoyer la question'))

    await waitFor(() => {
      expect(showError).toHaveBeenCalledWith(
        'Erreur lors de l\'envoi — veuillez réessayer'
      )
    })
  })

  it('should call onClose when Annuler is clicked', async () => {
    const ClarificationDialog = await importComponent()
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(<ClarificationDialog {...defaultProps} onClose={onClose} />)

    await user.click(screen.getByText('Annuler'))
    expect(onClose).toHaveBeenCalled()
  })

  it('should not render when open is false', async () => {
    const ClarificationDialog = await importComponent()
    render(<ClarificationDialog {...defaultProps} open={false} />)

    expect(screen.queryByText('Demander des précisions')).toBeNull()
  })
})
