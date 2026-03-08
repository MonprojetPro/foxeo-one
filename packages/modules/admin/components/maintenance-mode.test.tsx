import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MaintenanceMode } from './maintenance-mode'
import * as useMaintenanceModule from '../hooks/use-maintenance'
import * as toggleModule from '../actions/toggle-maintenance'

vi.mock('../hooks/use-maintenance')
vi.mock('../actions/toggle-maintenance')
vi.mock('@foxeo/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@foxeo/ui')>()
  return { ...actual, showSuccess: vi.fn(), showError: vi.fn() }
})
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })) }
})

const mockConfig = {
  enabled: false,
  message: 'La plateforme est en maintenance.',
  estimatedDuration: null,
}

describe('MaintenanceMode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useMaintenanceModule.useMaintenanceConfig).mockReturnValue({
      data: mockConfig,
      isPending: false,
      isError: false,
    } as ReturnType<typeof useMaintenanceModule.useMaintenanceConfig>)
  })

  it('renders loading skeletons when pending', () => {
    vi.mocked(useMaintenanceModule.useMaintenanceConfig).mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    } as ReturnType<typeof useMaintenanceModule.useMaintenanceConfig>)

    render(<MaintenanceMode />)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders toggle switch', () => {
    render(<MaintenanceMode />)
    expect(screen.getByRole('switch')).toBeTruthy()
  })

  it('renders message textarea', () => {
    render(<MaintenanceMode />)
    expect(screen.getByLabelText(/Message affiché aux clients/i)).toBeTruthy()
  })

  it('renders estimated duration input', () => {
    render(<MaintenanceMode />)
    expect(screen.getByLabelText(/Durée estimée/i)).toBeTruthy()
  })

  it('renders maintenance preview section', () => {
    render(<MaintenanceMode />)
    expect(screen.getByText(/Aperçu/i)).toBeTruthy()
  })

  it('calls toggleMaintenanceMode on save click', async () => {
    vi.mocked(toggleModule.toggleMaintenanceMode).mockResolvedValue({ data: { enabled: true }, error: null })

    render(<MaintenanceMode />)

    // Enable toggle
    const toggle = screen.getByRole('switch')
    fireEvent.click(toggle)

    // Click save
    const saveBtn = screen.getByRole('button', { name: /Activer la maintenance/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(vi.mocked(toggleModule.toggleMaintenanceMode)).toHaveBeenCalledWith({
        enabled: true,
        message: mockConfig.message,
        estimatedDuration: null,
      })
    })
  })

  it('shows error toast on action failure', async () => {
    vi.mocked(toggleModule.toggleMaintenanceMode).mockResolvedValue({
      data: null,
      error: { message: 'Erreur serveur', code: 'INTERNAL_ERROR' },
    })
    const { showError } = await import('@foxeo/ui')

    render(<MaintenanceMode />)
    const toggle = screen.getByRole('switch')
    fireEvent.click(toggle)

    const saveBtn = screen.getByRole('button', { name: /Activer la maintenance/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(vi.mocked(showError)).toHaveBeenCalledWith('Erreur serveur')
    })
  })
})
