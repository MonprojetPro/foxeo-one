import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const mockInvalidateQueries = vi.fn()
const mockPush = vi.fn()
const mockRefresh = vi.fn()
const mockApproveRequest = vi.fn()

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

vi.mock('../actions/approve-request', () => ({
  approveRequest: (...args: unknown[]) => mockApproveRequest(...args),
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

describe('ApproveDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function importComponent() {
    const { ApproveDialog } = await import('./approve-dialog')
    return ApproveDialog
  }

  it('should render the dialog with request summary', async () => {
    const ApproveDialog = await importComponent()
    render(<ApproveDialog {...defaultProps} />)

    expect(screen.getByText('Valider la demande')).toBeDefined()
    expect(screen.getByText('Brief Vision')).toBeDefined()
    expect(screen.getByText('Jean Dupont')).toBeDefined()
    expect(screen.getByText('Brief Lab')).toBeDefined()
  })

  it('should render optional comment textarea', async () => {
    const ApproveDialog = await importComponent()
    render(<ApproveDialog {...defaultProps} />)

    const textarea = screen.getByPlaceholderText('Commentaire pour le client (optionnel)')
    expect(textarea).toBeDefined()
  })

  it('should render Confirmer and Annuler buttons', async () => {
    const ApproveDialog = await importComponent()
    render(<ApproveDialog {...defaultProps} />)

    expect(screen.getByText('Confirmer la validation')).toBeDefined()
    expect(screen.getByText('Annuler')).toBeDefined()
  })

  it('should call onClose when Annuler is clicked', async () => {
    const onClose = vi.fn()
    const ApproveDialog = await importComponent()
    render(<ApproveDialog {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByText('Annuler'))
    expect(onClose).toHaveBeenCalled()
  })

  it('should submit without comment when textarea is empty', async () => {
    mockApproveRequest.mockResolvedValue({ data: { id: 'req-uuid' }, error: null })

    const ApproveDialog = await importComponent()
    render(<ApproveDialog {...defaultProps} />)

    const form = screen.getByText('Confirmer la validation').closest('form')!
    await act(async () => {
      fireEvent.submit(form)
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    // approveRequest called with the requestId (no comment = undefined)
    expect(mockApproveRequest).toHaveBeenCalledWith(defaultProps.requestId, undefined)
  })

  it('should call showSuccess and redirect on success', async () => {
    mockApproveRequest.mockResolvedValue({ data: { id: 'req-uuid' }, error: null })

    const { showSuccess } = await import('@monprojetpro/ui')
    const ApproveDialog = await importComponent()
    render(<ApproveDialog {...defaultProps} />)

    const form = screen.getByText('Confirmer la validation').closest('form')!
    await act(async () => {
      fireEvent.submit(form)
    })

    // Small delay to allow startTransition to process
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(showSuccess).toHaveBeenCalledWith('Demande validée avec succès')
    expect(mockPush).toHaveBeenCalledWith('/modules/validation-hub')
  })

  it('should call showError on failure', async () => {
    mockApproveRequest.mockResolvedValue({
      data: null,
      error: { message: 'Error', code: 'DB_ERROR' },
    })

    const { showError } = await import('@monprojetpro/ui')
    const ApproveDialog = await importComponent()
    render(<ApproveDialog {...defaultProps} />)

    const form = screen.getByText('Confirmer la validation').closest('form')!
    await act(async () => {
      fireEvent.submit(form)
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(showError).toHaveBeenCalledWith(
      'Erreur lors du traitement — veuillez réessayer'
    )
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('should invalidate parcours cache for brief_lab type', async () => {
    mockApproveRequest.mockResolvedValue({ data: { id: 'req-uuid' }, error: null })

    const ApproveDialog = await importComponent()
    render(<ApproveDialog {...defaultProps} type="brief_lab" clientId="client-uuid" />)

    const form = screen.getByText('Confirmer la validation').closest('form')!
    await act(async () => {
      fireEvent.submit(form)
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['parcours', 'client-uuid'],
    })
  })

  it('should NOT invalidate parcours cache for evolution_one type', async () => {
    mockApproveRequest.mockResolvedValue({ data: { id: 'req-uuid' }, error: null })

    const ApproveDialog = await importComponent()
    render(<ApproveDialog {...defaultProps} type="evolution_one" />)

    const form = screen.getByText('Confirmer la validation').closest('form')!
    await act(async () => {
      fireEvent.submit(form)
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
