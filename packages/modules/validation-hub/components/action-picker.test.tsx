import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

const mockReactivateLab = vi.fn()
const mockScheduleVisio = vi.fn()
const mockStartDev = vi.fn()

vi.mock('../actions/reactivate-lab', () => ({
  reactivateLab: (...args: unknown[]) => mockReactivateLab(...args),
}))

vi.mock('../actions/schedule-visio', () => ({
  scheduleVisio: (...args: unknown[]) => mockScheduleVisio(...args),
}))

vi.mock('../actions/start-dev', () => ({
  startDev: (...args: unknown[]) => mockStartDev(...args),
}))

vi.mock('./postpone-dialog', () => ({
  PostponeDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="postpone-dialog">PostponeDialog</div> : null,
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
  requestId: '00000000-0000-0000-0000-000000000001',
  clientId: '00000000-0000-0000-0000-000000000002',
  parcoursId: '00000000-0000-0000-0000-000000000003',
  bmadProjectPath: '/projects/client',
  requestTitle: 'Brief Test',
  clientName: 'Alice',
}

describe('ActionPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function importComponent() {
    const { ActionPicker } = await import('./action-picker')
    return ActionPicker
  }

  it('should render the trigger button', async () => {
    const ActionPicker = await importComponent()
    render(<ActionPicker {...defaultProps} />)

    expect(screen.getByText('Actions de traitement')).toBeDefined()
  })

  it('should open dropdown when button is clicked', async () => {
    const ActionPicker = await importComponent()
    const user = userEvent.setup()
    render(<ActionPicker {...defaultProps} />)

    await user.click(screen.getByText('Actions de traitement'))

    expect(screen.getByRole('menu')).toBeDefined()
    expect(screen.getByText('Réactiver le parcours Lab')).toBeDefined()
    expect(screen.getByText('Programmer une visio')).toBeDefined()
    expect(screen.getByText('Développer directement')).toBeDefined()
    expect(screen.getByText('Reporter')).toBeDefined()
  })

  it('should show option A only when parcoursId exists', async () => {
    const ActionPicker = await importComponent()
    const user = userEvent.setup()
    render(<ActionPicker {...defaultProps} parcoursId="00000000-0000-0000-0000-000000000003" />)

    await user.click(screen.getByText('Actions de traitement'))
    expect(screen.getByText('Réactiver le parcours Lab')).toBeDefined()
  })

  it('should NOT show option A when parcoursId is null', async () => {
    const ActionPicker = await importComponent()
    const user = userEvent.setup()
    render(<ActionPicker {...defaultProps} parcoursId={null} />)

    await user.click(screen.getByText('Actions de traitement'))
    expect(screen.queryByText('Réactiver le parcours Lab')).toBeNull()
  })

  it('should close dropdown when clicking outside', async () => {
    const ActionPicker = await importComponent()
    const user = userEvent.setup()
    render(
      <div>
        <ActionPicker {...defaultProps} />
        <div data-testid="outside">Outside</div>
      </div>
    )

    await user.click(screen.getByText('Actions de traitement'))
    expect(screen.getByRole('menu')).toBeDefined()

    await user.click(screen.getByTestId('outside'))
    await waitFor(() => {
      expect(screen.queryByRole('menu')).toBeNull()
    })
  })

  it('should call reactivateLab when option A is clicked', async () => {
    mockReactivateLab.mockResolvedValue({ data: { status: 'approved' }, error: null })
    const ActionPicker = await importComponent()
    const user = userEvent.setup()
    render(<ActionPicker {...defaultProps} />)

    await user.click(screen.getByText('Actions de traitement'))
    await user.click(screen.getByText('Réactiver le parcours Lab'))

    await waitFor(() => {
      expect(mockReactivateLab).toHaveBeenCalledWith(
        defaultProps.requestId,
        defaultProps.clientId,
        defaultProps.parcoursId
      )
    })
  })

  it('should show success toast after successful reactivateLab', async () => {
    mockReactivateLab.mockResolvedValue({ data: { status: 'approved' }, error: null })
    const ActionPicker = await importComponent()
    const { showSuccess } = await import('@monprojetpro/ui')
    const user = userEvent.setup()
    render(<ActionPicker {...defaultProps} />)

    await user.click(screen.getByText('Actions de traitement'))
    await user.click(screen.getByText('Réactiver le parcours Lab'))

    await waitFor(() => {
      expect(showSuccess).toHaveBeenCalledWith('Parcours Lab réactivé')
    })
  })

  it('should show error toast when reactivateLab fails', async () => {
    mockReactivateLab.mockResolvedValue({
      data: null,
      error: { message: 'DB error', code: 'DB_ERROR' },
    })
    const ActionPicker = await importComponent()
    const { showError } = await import('@monprojetpro/ui')
    const user = userEvent.setup()
    render(<ActionPicker {...defaultProps} />)

    await user.click(screen.getByText('Actions de traitement'))
    await user.click(screen.getByText('Réactiver le parcours Lab'))

    await waitFor(() => {
      expect(showError).toHaveBeenCalledWith(
        'Erreur lors de la réactivation — veuillez réessayer'
      )
    })
  })

  it('should call scheduleVisio when option B is clicked', async () => {
    mockScheduleVisio.mockResolvedValue({
      data: { request: { status: 'pending' }, calComUrl: 'https://cal.com/test' },
      error: null,
    })
    // Mock window.open
    const windowOpen = vi.spyOn(window, 'open').mockImplementation(() => null)
    const ActionPicker = await importComponent()
    const user = userEvent.setup()
    render(<ActionPicker {...defaultProps} />)

    await user.click(screen.getByText('Actions de traitement'))
    await user.click(screen.getByText('Programmer une visio'))

    await waitFor(() => {
      expect(mockScheduleVisio).toHaveBeenCalledWith(
        defaultProps.requestId,
        defaultProps.clientId
      )
    })
    windowOpen.mockRestore()
  })

  it('should call startDev when option C is clicked', async () => {
    mockStartDev.mockResolvedValue({
      data: { request: { status: 'approved' }, cursorUrl: 'cursor:///projects/client' },
      error: null,
    })
    vi.spyOn(window, 'open').mockImplementation(() => null)
    const ActionPicker = await importComponent()
    const user = userEvent.setup()
    render(<ActionPicker {...defaultProps} />)

    await user.click(screen.getByText('Actions de traitement'))
    await user.click(screen.getByText('Développer directement'))

    await waitFor(() => {
      expect(mockStartDev).toHaveBeenCalledWith(
        defaultProps.requestId,
        defaultProps.clientId,
        defaultProps.requestTitle
      )
    })
  })

  it('should show success toast with cursor message after successful startDev with cursorUrl', async () => {
    mockStartDev.mockResolvedValue({
      data: { request: { status: 'approved' }, cursorUrl: 'cursor:///projects/client' },
      error: null,
    })
    const ActionPicker = await importComponent()
    const { showSuccess } = await import('@monprojetpro/ui')
    const user = userEvent.setup()
    vi.spyOn(window, 'open').mockImplementation(() => null)
    render(<ActionPicker {...defaultProps} />)

    await user.click(screen.getByText('Actions de traitement'))
    await user.click(screen.getByText('Développer directement'))

    await waitFor(() => {
      expect(showSuccess).toHaveBeenCalledWith('Demande prise en charge — bon dev !')
    })
  })

  it('should show informational success toast when cursorUrl is null', async () => {
    mockStartDev.mockResolvedValue({
      data: { request: { status: 'approved' }, cursorUrl: null },
      error: null,
    })
    const ActionPicker = await importComponent()
    const { showSuccess } = await import('@monprojetpro/ui')
    const user = userEvent.setup()
    render(<ActionPicker {...defaultProps} />)

    await user.click(screen.getByText('Actions de traitement'))
    await user.click(screen.getByText('Développer directement'))

    await waitFor(() => {
      expect(showSuccess).toHaveBeenCalledWith(
        'Demande prise en charge — le chemin BMAD n\'est pas configuré pour ce client'
      )
    })
  })

  it('should be disabled when disabled prop is true', async () => {
    const ActionPicker = await importComponent()
    render(<ActionPicker {...defaultProps} disabled />)

    const button = screen.getByText('Actions de traitement').closest('button')
    expect(button?.disabled).toBe(true)
  })

  it('should open postpone dialog when option D is clicked', async () => {
    const ActionPicker = await importComponent()
    const user = userEvent.setup()
    render(<ActionPicker {...defaultProps} />)

    await user.click(screen.getByText('Actions de traitement'))
    await user.click(screen.getByText('Reporter'))

    await waitFor(() => {
      expect(screen.getByTestId('postpone-dialog')).toBeDefined()
    })
  })

  it('should show all 4 options descriptions', async () => {
    const ActionPicker = await importComponent()
    const user = userEvent.setup()
    render(<ActionPicker {...defaultProps} />)

    await user.click(screen.getByText('Actions de traitement'))

    expect(screen.getByText('Le besoin est trop complexe — le client doit passer par un parcours complet')).toBeDefined()
    expect(screen.getByText('Besoin de clarifier en direct avec le client')).toBeDefined()
    expect(screen.getByText('Le besoin est clair — je le développe')).toBeDefined()
    expect(screen.getByText('Pas maintenant — à traiter plus tard')).toBeDefined()
  })
})
