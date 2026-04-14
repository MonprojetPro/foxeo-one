import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GraduationDialog } from './graduation-dialog'

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock('../actions/graduate-client', () => ({
  graduateClient: vi.fn().mockResolvedValue({ data: null, error: null }),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }
})

const mockParcours = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  clientId: '550e8400-e29b-41d4-a716-446655440001',
  templateId: null,
  operatorId: '550e8400-e29b-41d4-a716-446655440002',
  activeStages: [
    { key: 'stage-1', active: true, status: 'completed' },
    { key: 'stage-2', active: true, status: 'completed' },
  ],
  status: 'termine' as const,
  startedAt: '2026-01-01T00:00:00.000Z',
  suspendedAt: null,
  completedAt: '2026-02-15T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-02-15T00:00:00.000Z',
}

const defaultProps = {
  clientId: '550e8400-e29b-41d4-a716-446655440001',
  clientName: 'Jean Dupont',
  clientCompany: 'Acme Corp',
  parcours: mockParcours,
  open: true,
  onOpenChange: vi.fn(),
  onSuccess: vi.fn(),
}

describe('GraduationDialog', () => {
  it('should render dialog title', () => {
    render(<GraduationDialog {...defaultProps} />)

    expect(screen.getByText('Graduer vers MonprojetPro One')).toBeDefined()
  })

  it('should display client name and company', () => {
    render(<GraduationDialog {...defaultProps} />)

    expect(screen.getByText('Jean Dupont')).toBeDefined()
    expect(screen.getByText('Acme Corp')).toBeDefined()
  })

  it('should pre-select "Essentiel" tier by default', () => {
    render(<GraduationDialog {...defaultProps} />)

    // The Essentiel tier button should have border-primary styling (selected)
    const essentialButton = screen.getByText('Essentiel — 49€/mois').closest('button')
    expect(essentialButton?.className).toContain('border-primary')
  })

  it('should show all three tier options', () => {
    render(<GraduationDialog {...defaultProps} />)

    expect(screen.getByText('Ponctuel')).toBeDefined()
    expect(screen.getByText('Essentiel — 49€/mois')).toBeDefined()
    expect(screen.getByText('Agentique — 99€/mois')).toBeDefined()
  })

  it('should pre-check default modules (core-dashboard, documents, chat)', () => {
    render(<GraduationDialog {...defaultProps} />)

    const checkboxes = screen.getAllByRole('checkbox')
    const labels = ['Dashboard', 'Documents', 'Messagerie']

    for (const label of labels) {
      const checkboxLabel = screen.getByText(label)
      const checkbox = checkboxLabel.closest('label')?.querySelector('input[type="checkbox"]')
      expect((checkbox as HTMLInputElement)?.checked).toBe(true)
    }
    expect(checkboxes.length).toBeGreaterThan(0)
  })

  it('should show validation error when no module is selected', async () => {
    const user = userEvent.setup()
    render(<GraduationDialog {...defaultProps} />)

    // Uncheck all default modules
    const checkboxes = screen.getAllByRole('checkbox')
    for (const checkbox of checkboxes) {
      if ((checkbox as HTMLInputElement).checked) {
        await user.click(checkbox)
      }
    }

    expect(screen.getByText('Au moins un module doit être sélectionné')).toBeDefined()
  })

  it('should display confirm and cancel buttons', () => {
    render(<GraduationDialog {...defaultProps} />)

    expect(screen.getByText('Confirmer la graduation')).toBeDefined()
    expect(screen.getByText('Annuler')).toBeDefined()
  })

  it('should disable confirm button when no module selected', async () => {
    const user = userEvent.setup()
    render(<GraduationDialog {...defaultProps} />)

    const checkboxes = screen.getAllByRole('checkbox')
    for (const checkbox of checkboxes) {
      if ((checkbox as HTMLInputElement).checked) {
        await user.click(checkbox)
      }
    }

    const confirmBtn = screen.getByText('Confirmer la graduation').closest('button')
    expect(confirmBtn?.disabled).toBe(true)
  })

  it('should display parcours stats', () => {
    render(<GraduationDialog {...defaultProps} />)

    // 2/2 steps completed
    expect(screen.getByText('2 / 2')).toBeDefined()
  })

  it('should call onOpenChange when Annuler is clicked', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(<GraduationDialog {...defaultProps} onOpenChange={onOpenChange} />)

    await user.click(screen.getByText('Annuler'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('should have correct displayName', () => {
    expect(GraduationDialog.displayName).toBe('GraduationDialog')
  })
})
