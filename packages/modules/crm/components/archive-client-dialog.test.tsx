import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ArchiveClientDialog } from './archive-client-dialog'

// Mock dependencies
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock('../actions/archive-client', () => ({
  archiveClient: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }
})

describe('ArchiveClientDialog', () => {
  const defaultProps = {
    clientId: '550e8400-e29b-41d4-a716-446655440001',
    clientName: 'Jean Dupont',
    open: true,
    onOpenChange: vi.fn(),
  }

  it('should render dialog title', () => {
    render(<ArchiveClientDialog {...defaultProps} />)

    expect(screen.getByRole('heading', { name: /archiver le client/i })).toBeInTheDocument()
  })

  it('should display client name in description', () => {
    render(<ArchiveClientDialog {...defaultProps} />)

    expect(screen.getByText(/Jean Dupont/)).toBeInTheDocument()
  })

  it('should display consequences warning', () => {
    render(<ArchiveClientDialog {...defaultProps} />)

    expect(screen.getByText(/perdra l.*accès immédiatement/i)).toBeInTheDocument()
    expect(screen.getByText(/données conservées/i)).toBeInTheDocument()
    expect(screen.getByText(/réactivation possible/i)).toBeInTheDocument()
  })

  it('should render retention slider with default 90 days', () => {
    render(<ArchiveClientDialog {...defaultProps} />)

    const slider = screen.getByRole('slider')
    expect(slider).toBeInTheDocument()
    expect(slider).toHaveValue('90')
  })

  it('should display current retention days in label', () => {
    render(<ArchiveClientDialog {...defaultProps} />)

    // Slider is present with value 90
    const slider = screen.getByRole('slider')
    expect(slider).toHaveValue('90')
  })

  it('should show slider range labels (30 and 365)', () => {
    render(<ArchiveClientDialog {...defaultProps} />)

    expect(screen.getByText('30 jours')).toBeInTheDocument()
    expect(screen.getByText('365 jours')).toBeInTheDocument()
  })

  it('should render cancel and confirm buttons', () => {
    render(<ArchiveClientDialog {...defaultProps} />)

    expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirmer l.*archivage/i })).toBeInTheDocument()
  })

  it('should update retention days display when slider changes', () => {
    render(<ArchiveClientDialog {...defaultProps} />)

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '180' } })

    // Slider value should be updated
    expect(slider).toHaveValue('180')
  })

  it('should NOT render when open is false', () => {
    render(<ArchiveClientDialog {...defaultProps} open={false} />)

    expect(screen.queryByText('Archiver le client')).not.toBeInTheDocument()
  })

  it('should call archiveClient with clientId and retentionDays on confirm', async () => {
    const { archiveClient } = await import('../actions/archive-client')
    const user = userEvent.setup()

    render(<ArchiveClientDialog {...defaultProps} />)

    const confirmButton = screen.getByTestId('confirm-archive-button')
    await user.click(confirmButton)

    expect(archiveClient).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: '550e8400-e29b-41d4-a716-446655440001',
        retentionDays: expect.any(Number),
      })
    )
  })
})
