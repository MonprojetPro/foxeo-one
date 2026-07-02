import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MaintenanceMode } from './maintenance-mode'
import * as useMaintenanceModule from '../hooks/use-maintenance'
import * as toggleModule from '../actions/toggle-maintenance'

vi.mock('../hooks/use-maintenance')
vi.mock('../actions/toggle-maintenance')
vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
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

function mockUseMaintenance(config: typeof mockConfig | undefined, isPending = false) {
  vi.mocked(useMaintenanceModule.useMaintenanceConfig).mockReturnValue({
    data: config,
    isPending,
    isError: false,
  } as ReturnType<typeof useMaintenanceModule.useMaintenanceConfig>)
}

describe('MaintenanceMode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseMaintenance(mockConfig)
  })

  it('renders loading skeletons when pending', () => {
    mockUseMaintenance(undefined, true)
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

  it('activation via toggle asks for confirmation, then saves with enabled: true', async () => {
    vi.mocked(toggleModule.toggleMaintenanceMode).mockResolvedValue({ data: { enabled: true }, error: null })

    render(<MaintenanceMode />)

    // Le toggle est l'interrupteur : l'activation déclenche une confirmation
    fireEvent.click(screen.getByRole('switch'))
    const confirmBtn = await screen.findByRole('button', { name: /Activer la maintenance/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(vi.mocked(toggleModule.toggleMaintenanceMode)).toHaveBeenCalledWith({
        enabled: true,
        message: mockConfig.message,
        estimatedDuration: null,
      })
    })
  })

  it('deactivation via toggle saves immediately with enabled: false (no confirm)', async () => {
    mockUseMaintenance({ ...mockConfig, enabled: true })
    vi.mocked(toggleModule.toggleMaintenanceMode).mockResolvedValue({ data: { enabled: false }, error: null })

    render(<MaintenanceMode />)
    fireEvent.click(screen.getByRole('switch'))

    await waitFor(() => {
      expect(vi.mocked(toggleModule.toggleMaintenanceMode)).toHaveBeenCalledWith({
        enabled: false,
        message: mockConfig.message,
        estimatedDuration: null,
      })
    })
  })

  it('save settings button persists message without changing on/off state', async () => {
    vi.mocked(toggleModule.toggleMaintenanceMode).mockResolvedValue({ data: { enabled: false }, error: null })

    render(<MaintenanceMode />)

    // Réglages non modifiés → bouton désactivé
    const saveBtn = screen.getByRole('button', { name: /Enregistrer les réglages/i })
    expect(saveBtn.hasAttribute('disabled')).toBe(true)

    // On modifie le message → bouton actif
    fireEvent.change(screen.getByLabelText(/Message affiché aux clients/i), {
      target: { value: 'Retour dans 1 heure' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer les réglages/i }))

    await waitFor(() => {
      expect(vi.mocked(toggleModule.toggleMaintenanceMode)).toHaveBeenCalledWith({
        enabled: false,
        message: 'Retour dans 1 heure',
        estimatedDuration: null,
      })
    })
  })

  it('shows error toast on action failure', async () => {
    mockUseMaintenance({ ...mockConfig, enabled: true })
    vi.mocked(toggleModule.toggleMaintenanceMode).mockResolvedValue({
      data: null,
      error: { message: 'Erreur serveur', code: 'INTERNAL_ERROR' },
    })
    const { showError } = await import('@monprojetpro/ui')

    render(<MaintenanceMode />)
    // Désactivation (pas de confirm) → appel direct qui échoue
    fireEvent.click(screen.getByRole('switch'))

    await waitFor(() => {
      expect(vi.mocked(showError)).toHaveBeenCalledWith('Erreur serveur')
    })
  })
})
