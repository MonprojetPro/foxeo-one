import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EmailTemplateEditor } from './email-template-editor'

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

vi.mock('../hooks/use-email-templates', () => ({
  useEmailTemplates: vi.fn(),
}))

vi.mock('../actions/save-email-template', () => ({
  saveEmailTemplate: vi.fn(),
  resetEmailTemplate: vi.fn(),
}))

import { useEmailTemplates } from '../hooks/use-email-templates'
import { saveEmailTemplate, resetEmailTemplate } from '../actions/save-email-template'
import { showSuccess, showError } from '@monprojetpro/ui'

const MOCK_TEMPLATES = [
  {
    id: 'email-1',
    templateKey: 'brief_valide',
    subject: 'Votre brief a été validé',
    body: 'Bonjour {prenom}, votre brief "{titre_brief}" a été validé.',
    variables: ['prenom', 'titre_brief'],
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'email-2',
    templateKey: 'graduation',
    subject: 'Félicitations !',
    body: 'Bonjour {prenom}, votre espace One est prêt : {lien}',
    variables: ['prenom', 'lien'],
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useEmailTemplates).mockReturnValue({
    data: MOCK_TEMPLATES,
    isPending: false,
    error: null,
  } as ReturnType<typeof useEmailTemplates>)
})

// ============================================================
// Tests
// ============================================================

describe('EmailTemplateEditor', () => {
  it('affiche la liste des templates disponibles', () => {
    render(<EmailTemplateEditor />)
    expect(screen.getByText('Brief validé')).toBeTruthy()
    expect(screen.getByText('Graduation Lab → One')).toBeTruthy()
  })

  it('affiche un message par défaut quand aucun template n\'est sélectionné', () => {
    render(<EmailTemplateEditor />)
    expect(screen.getByText(/sélectionne un template/i)).toBeTruthy()
  })

  it('affiche l\'éditeur et le sujet quand un template est sélectionné', () => {
    render(<EmailTemplateEditor />)
    fireEvent.click(screen.getByText('Brief validé'))
    expect(screen.getByDisplayValue('Votre brief a été validé')).toBeTruthy()
    expect(screen.getByDisplayValue('Bonjour {prenom}, votre brief "{titre_brief}" a été validé.')).toBeTruthy()
  })

  it('insère une variable dans le body au clic sur le bouton variable', () => {
    render(<EmailTemplateEditor />)
    fireEvent.click(screen.getByText('Brief validé'))
    const bodyTextarea = screen.getByDisplayValue('Bonjour {prenom}, votre brief "{titre_brief}" a été validé.')
    const varButton = screen.getByRole('button', { name: '{lien}' })
    fireEvent.click(varButton)
    expect((bodyTextarea as HTMLTextAreaElement).value).toContain('{lien}')
  })

  it('affiche la prévisualisation avec des données de substitution', () => {
    render(<EmailTemplateEditor />)
    fireEvent.click(screen.getByText('Brief validé'))
    fireEvent.click(screen.getByText('Aperçu'))
    expect(screen.getByText(/sujet/i)).toBeTruthy()
    // Preview contains substituted data
    expect(screen.getByText(/jean-pierre/i)).toBeTruthy()
  })

  it('appelle saveEmailTemplate et showSuccess à la sauvegarde', async () => {
    vi.mocked(saveEmailTemplate).mockResolvedValue({
      data: { ...MOCK_TEMPLATES[0], subject: 'Nouveau sujet' },
      error: null,
    })
    render(<EmailTemplateEditor />)
    fireEvent.click(screen.getByText('Brief validé'))
    fireEvent.click(screen.getByRole('button', { name: /sauvegarder/i }))
    await waitFor(() => {
      expect(saveEmailTemplate).toHaveBeenCalledWith({
        templateKey: 'brief_valide',
        subject: 'Votre brief a été validé',
        body: 'Bonjour {prenom}, votre brief "{titre_brief}" a été validé.',
      })
      expect(showSuccess).toHaveBeenCalledWith('Template email sauvegardé')
    })
  })

  it('appelle resetEmailTemplate et met à jour les champs', async () => {
    vi.mocked(resetEmailTemplate).mockResolvedValue({
      data: { ...MOCK_TEMPLATES[0], subject: 'Sujet par défaut' },
      error: null,
    })
    render(<EmailTemplateEditor />)
    fireEvent.click(screen.getByText('Brief validé'))
    fireEvent.click(screen.getByText('Réinitialiser'))
    await waitFor(() => {
      expect(resetEmailTemplate).toHaveBeenCalledWith('brief_valide')
      expect(showSuccess).toHaveBeenCalledWith('Template réinitialisé')
    })
  })
})
