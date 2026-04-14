import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ParcourTemplateEditor } from './parcours-template-editor'

// ============================================================
// Mocks
// ============================================================

const mockInvalidateQueries = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({ invalidateQueries: mockInvalidateQueries })),
  useQuery: vi.fn(),
}))

vi.mock('@monprojetpro/ui', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}))

vi.mock('../hooks/use-parcours-templates', () => ({
  useParcourTemplates: vi.fn(),
}))

vi.mock('../actions/save-parcours-template', () => ({
  saveParcourTemplate: vi.fn(),
  duplicateParcourTemplate: vi.fn(),
  archiveParcourTemplate: vi.fn(),
}))

import { useParcourTemplates } from '../hooks/use-parcours-templates'
import { saveParcourTemplate, duplicateParcourTemplate, archiveParcourTemplate } from '../actions/save-parcours-template'
import { showSuccess, showError } from '@monprojetpro/ui'

const MOCK_TEMPLATES = [
  {
    id: 'tmpl-1',
    operatorId: 'op-1',
    name: 'Parcours Standard',
    description: 'Un parcours complet',
    parcoursType: 'complet' as const,
    stages: [
      { key: 'vision', name: 'Vision', description: 'Vision business', order: 1, active_by_default: true, elio_prompts: '' },
      { key: 'offre', name: 'Offre', description: 'Structurer l offre', order: 2, active_by_default: true, elio_prompts: '' },
    ],
    isActive: true,
    clientCount: 3,
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useParcourTemplates).mockReturnValue({
    data: MOCK_TEMPLATES,
    isPending: false,
    error: null,
  } as ReturnType<typeof useParcourTemplates>)
})

// ============================================================
// Tests
// ============================================================

describe('ParcourTemplateEditor', () => {
  it('affiche la liste des templates avec nom, étapes, clients', () => {
    render(<ParcourTemplateEditor />)
    expect(screen.getByText('Parcours Standard')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy() // nb étapes
    expect(screen.getByText('3')).toBeTruthy() // nb clients
  })

  it('affiche le bouton "Nouveau template"', () => {
    render(<ParcourTemplateEditor />)
    expect(screen.getByText('+ Nouveau template')).toBeTruthy()
  })

  it('ouvre le formulaire d\'édition au clic sur "Nouveau template"', () => {
    render(<ParcourTemplateEditor />)
    fireEvent.click(screen.getByText('+ Nouveau template'))
    expect(screen.getByText('Nouveau template')).toBeTruthy()
    expect(screen.getByPlaceholderText('Ex: Parcours Standard')).toBeTruthy()
  })

  it('ouvre le formulaire pré-rempli au clic sur "Modifier"', () => {
    render(<ParcourTemplateEditor />)
    fireEvent.click(screen.getByText('Modifier'))
    expect(screen.getByDisplayValue('Parcours Standard')).toBeTruthy()
  })

  it('appelle saveParcourTemplate et showSuccess à la sauvegarde', async () => {
    vi.mocked(saveParcourTemplate).mockResolvedValue({
      data: MOCK_TEMPLATES[0],
      error: null,
    })
    render(<ParcourTemplateEditor />)
    fireEvent.click(screen.getByText('+ Nouveau template'))
    // Fill required fields
    const nameInput = screen.getByPlaceholderText('Ex: Parcours Standard')
    fireEvent.change(nameInput, { target: { value: 'Mon Parcours' } })
    // Fill stage names (minimum 2 are pre-filled but empty)
    const stageInputs = screen.getAllByPlaceholderText("Titre de l'étape")
    fireEvent.change(stageInputs[0], { target: { value: 'Étape 1' } })
    fireEvent.change(stageInputs[1], { target: { value: 'Étape 2' } })
    fireEvent.click(screen.getByRole('button', { name: /sauvegarder/i }))
    await waitFor(() => {
      expect(saveParcourTemplate).toHaveBeenCalled()
      expect(showSuccess).toHaveBeenCalledWith('Template sauvegardé')
    })
  })

  it('appelle duplicateParcourTemplate et showSuccess à la duplication', async () => {
    vi.mocked(duplicateParcourTemplate).mockResolvedValue({
      data: { ...MOCK_TEMPLATES[0], id: 'tmpl-copy', name: '[Copie] Parcours Standard' },
      error: null,
    })
    render(<ParcourTemplateEditor />)
    fireEvent.click(screen.getByText('Dupliquer'))
    await waitFor(() => {
      expect(duplicateParcourTemplate).toHaveBeenCalledWith('tmpl-1')
      expect(showSuccess).toHaveBeenCalledWith('Template dupliqué')
    })
  })
})
