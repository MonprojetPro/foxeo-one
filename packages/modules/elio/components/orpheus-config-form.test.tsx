import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

// Mock server actions
vi.mock('../actions/update-elio-config', () => ({
  updateElioConfig: vi.fn(),
}))

vi.mock('../actions/reset-elio-config', () => ({
  resetElioConfig: vi.fn(),
}))

// Mock @monprojetpro/ui
vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }
})

import { OrpheusConfigForm } from './orpheus-config-form'
import { updateElioConfig } from '../actions/update-elio-config'
import { resetElioConfig } from '../actions/reset-elio-config'
import { showSuccess, showError } from '@monprojetpro/ui'
import { DEFAULT_ELIO_CONFIG, type ElioConfig } from '../types/elio-config.types'

describe('OrpheusConfigForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche les valeurs par défaut quand initialConfig est null', () => {
    render(<OrpheusConfigForm initialConfig={null} />)

    // Le slider de température devrait montrer 1.0
    expect(screen.getByText(/1\.0/)).toBeDefined()

    // Les boutons doivent être présents
    expect(screen.getByText('Enregistrer')).toBeDefined()
    expect(screen.getByText('Réinitialiser')).toBeDefined()
  })

  it('affiche les valeurs initiales si une config est fournie', () => {
    const customConfig: ElioConfig = {
      model: 'claude-haiku-4-20250122',
      temperature: 0.5,
      maxTokens: 1000,
      customInstructions: 'Instructions de test',
      enabledFeatures: {},
    }

    render(<OrpheusConfigForm initialConfig={customConfig} />)

    expect(screen.getByText(/0\.5/)).toBeDefined()

    const textarea = screen.getByPlaceholderText(/analogies/)
    expect((textarea as HTMLTextAreaElement).value).toBe('Instructions de test')
  })

  it('appelle updateElioConfig lors de la sauvegarde', async () => {
    vi.mocked(updateElioConfig).mockResolvedValue({ data: DEFAULT_ELIO_CONFIG, error: null })

    render(<OrpheusConfigForm initialConfig={null} />)

    const saveButton = screen.getByText('Enregistrer')
    await act(async () => {
      fireEvent.click(saveButton)
    })

    expect(updateElioConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        model: DEFAULT_ELIO_CONFIG.model,
        temperature: DEFAULT_ELIO_CONFIG.temperature,
        maxTokens: DEFAULT_ELIO_CONFIG.maxTokens,
      })
    )
    expect(showSuccess).toHaveBeenCalledWith('Configuration Orpheus enregistrée.')
  })

  it('affiche une erreur si updateElioConfig échoue', async () => {
    vi.mocked(updateElioConfig).mockResolvedValue({
      data: null,
      error: { message: 'Erreur DB', code: 'DB_ERROR' },
    })

    render(<OrpheusConfigForm initialConfig={null} />)

    const saveButton = screen.getByText('Enregistrer')
    await act(async () => {
      fireEvent.click(saveButton)
    })

    expect(showError).toHaveBeenCalled()
  })

  it('appelle resetElioConfig avec confirmation et remet les valeurs par défaut', async () => {
    vi.mocked(resetElioConfig).mockResolvedValue({ data: DEFAULT_ELIO_CONFIG, error: null })

    // Simuler window.confirm retournant true
    const originalConfirm = window.confirm
    window.confirm = vi.fn().mockReturnValue(true)

    render(<OrpheusConfigForm initialConfig={null} />)

    const resetButton = screen.getByText('Réinitialiser')
    await act(async () => {
      fireEvent.click(resetButton)
    })

    expect(resetElioConfig).toHaveBeenCalled()
    expect(showSuccess).toHaveBeenCalledWith('Configuration réinitialisée aux valeurs par défaut.')

    window.confirm = originalConfirm
  })

  it('ne call pas resetElioConfig si confirmation annulée', async () => {
    const originalConfirm = window.confirm
    window.confirm = vi.fn().mockReturnValue(false)

    render(<OrpheusConfigForm initialConfig={null} />)

    const resetButton = screen.getByText('Réinitialiser')
    await act(async () => {
      fireEvent.click(resetButton)
    })

    expect(resetElioConfig).not.toHaveBeenCalled()

    window.confirm = originalConfirm
  })

  it('affiche une erreur de validation si max_tokens hors limites', async () => {
    render(<OrpheusConfigForm initialConfig={null} />)

    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '50' } })

    const saveButton = screen.getByText('Enregistrer')
    await act(async () => {
      fireEvent.click(saveButton)
    })

    expect(screen.getByText(/entre 100 et 8000/)).toBeDefined()
    expect(updateElioConfig).not.toHaveBeenCalled()
  })
})
