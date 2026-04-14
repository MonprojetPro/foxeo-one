import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockInvalidateQueries = vi.fn()
const mockPush = vi.fn()
const mockRefresh = vi.fn()
const mockRejectRequest = vi.fn()

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQueryClient: vi.fn(() => ({
      invalidateQueries: mockInvalidateQueries,
    })),
  }
})

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    refresh: mockRefresh,
  })),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }
})

vi.mock('../actions/reject-request', () => ({
  rejectRequest: (...args: unknown[]) => mockRejectRequest(...args),
}))

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  requestId: 'req-uuid',
  clientId: 'client-uuid',
  title: 'Brief Vision',
  clientName: 'Jean Dupont',
  type: 'brief_lab' as const,
}

describe('RejectDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function importComponent() {
    const { RejectDialog } = await import('./reject-dialog')
    return RejectDialog
  }

  it('should render the dialog with request summary', async () => {
    const RejectDialog = await importComponent()
    render(<RejectDialog {...defaultProps} />)

    expect(screen.getByText('Refuser la demande')).toBeDefined()
    expect(screen.getByText('Brief Vision')).toBeDefined()
    expect(screen.getByText('Jean Dupont')).toBeDefined()
    expect(screen.getByText('Brief Lab')).toBeDefined()
  })

  it('should render required comment textarea', async () => {
    const RejectDialog = await importComponent()
    render(<RejectDialog {...defaultProps} />)

    const textarea = screen.getByPlaceholderText(
      'Expliquez au client ce qui doit être modifié...'
    )
    expect(textarea).toBeDefined()
  })

  it('should render Confirmer and Annuler buttons', async () => {
    const RejectDialog = await importComponent()
    render(<RejectDialog {...defaultProps} />)

    expect(screen.getByText('Confirmer le refus')).toBeDefined()
    expect(screen.getByText('Annuler')).toBeDefined()
  })

  it('should have submit button disabled when form is empty', async () => {
    const RejectDialog = await importComponent()
    render(<RejectDialog {...defaultProps} />)

    const submitBtn = screen.getByText('Confirmer le refus').closest('button')!
    expect(submitBtn.disabled).toBe(true)
  })

  it('should have submit button disabled when comment has less than 10 chars', async () => {
    const RejectDialog = await importComponent()
    render(<RejectDialog {...defaultProps} />)

    const textarea = screen.getByPlaceholderText(
      'Expliquez au client ce qui doit être modifié...'
    )

    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'Court' } })
    })

    await waitFor(() => {
      const submitBtn = screen.getByText('Confirmer le refus').closest('button')!
      expect(submitBtn.disabled).toBe(true)
    })
  })

  it('should show validation error when comment is too short', async () => {
    const RejectDialog = await importComponent()
    render(<RejectDialog {...defaultProps} />)

    const textarea = screen.getByPlaceholderText(
      'Expliquez au client ce qui doit être modifié...'
    )

    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'Court' } })
      fireEvent.blur(textarea)
    })

    await waitFor(() => {
      expect(screen.getByText('Le commentaire doit contenir au moins 10 caractères')).toBeDefined()
    })
  })

  it('should enable submit button when comment has 10+ chars', async () => {
    const RejectDialog = await importComponent()
    render(<RejectDialog {...defaultProps} />)

    const textarea = screen.getByPlaceholderText(
      'Expliquez au client ce qui doit être modifié...'
    )

    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'Commentaire suffisamment long' } })
    })

    await waitFor(() => {
      const submitBtn = screen.getByText('Confirmer le refus').closest('button')!
      expect(submitBtn.disabled).toBe(false)
    })
  })

  it('should call onClose when Annuler is clicked', async () => {
    const onClose = vi.fn()
    const RejectDialog = await importComponent()
    render(<RejectDialog {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByText('Annuler'))
    expect(onClose).toHaveBeenCalled()
  })

  it('should call showSuccess and redirect on successful rejection', async () => {
    mockRejectRequest.mockResolvedValue({ data: { id: 'req-uuid' }, error: null })

    const { showSuccess } = await import('@monprojetpro/ui')
    const RejectDialog = await importComponent()
    render(<RejectDialog {...defaultProps} />)

    const textarea = screen.getByPlaceholderText(
      'Expliquez au client ce qui doit être modifié...'
    )

    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'Veuillez préciser votre cible et votre offre commerciale.' } })
    })

    await waitFor(() => {
      const submitBtn = screen.getByText('Confirmer le refus').closest('button')!
      expect(submitBtn.disabled).toBe(false)
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Confirmer le refus'))
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(showSuccess).toHaveBeenCalledWith('Demande refusée — le client a été notifié')
    expect(mockPush).toHaveBeenCalledWith('/modules/validation-hub')
  })

  it('should call showError on failure', async () => {
    mockRejectRequest.mockResolvedValue({
      data: null,
      error: { message: 'Error', code: 'DB_ERROR' },
    })

    const { showError } = await import('@monprojetpro/ui')
    const RejectDialog = await importComponent()
    render(<RejectDialog {...defaultProps} />)

    const textarea = screen.getByPlaceholderText(
      'Expliquez au client ce qui doit être modifié...'
    )

    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'Veuillez préciser votre cible.' } })
    })

    await waitFor(() => {
      const submitBtn = screen.getByText('Confirmer le refus').closest('button')!
      expect(submitBtn.disabled).toBe(false)
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Confirmer le refus'))
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(showError).toHaveBeenCalledWith(
      'Erreur lors du traitement — veuillez réessayer'
    )
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('should NOT invalidate parcours cache on reject (parcours unchanged)', async () => {
    mockRejectRequest.mockResolvedValue({ data: { id: 'req-uuid' }, error: null })

    const RejectDialog = await importComponent()
    render(<RejectDialog {...defaultProps} type="brief_lab" clientId="client-uuid" />)

    const textarea = screen.getByPlaceholderText(
      'Expliquez au client ce qui doit être modifié...'
    )

    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'Veuillez préciser votre cible.' } })
    })

    await waitFor(() => {
      const submitBtn = screen.getByText('Confirmer le refus').closest('button')!
      expect(submitBtn.disabled).toBe(false)
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Confirmer le refus'))
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    const parcoursCall = (mockInvalidateQueries as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: unknown[]) =>
        Array.isArray(call) &&
        call[0] &&
        typeof call[0] === 'object' &&
        'queryKey' in (call[0] as object) &&
        Array.isArray((call[0] as { queryKey: unknown[] }).queryKey) &&
        (call[0] as { queryKey: unknown[] }).queryKey[0] === 'parcours'
    )
    expect(parcoursCall).toBeUndefined()
  })
})
