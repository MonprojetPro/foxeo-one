import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ElioDocForm } from './elio-doc-form'

const mockInjectElioDocumentation = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('../actions/inject-elio-documentation', () => ({
  injectElioDocumentation: (...args: unknown[]) => mockInjectElioDocumentation(...args),
}))

vi.mock('@hookform/resolvers/zod', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hookform/resolvers/zod')>()
  return actual
})

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return {
    ...actual,
    showSuccess: (...args: unknown[]) => mockShowSuccess(...args),
    showError: (...args: unknown[]) => mockShowError(...args),
    Button: ({
      children,
      onClick,
      disabled,
      type,
    }: {
      children: React.ReactNode
      onClick?: () => void
      disabled?: boolean
      type?: 'button' | 'submit' | 'reset'
    }) => (
      <button type={type ?? 'button'} onClick={onClick} disabled={disabled}>
        {children}
      </button>
    ),
  }
})

const CLIENT_ID = '123e4567-e89b-12d3-a456-426614174000'
const ACTIVE_MODULES = ['core-dashboard', 'crm', 'signature']

describe('ElioDocForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInjectElioDocumentation.mockResolvedValue({ data: undefined, error: null })
  })

  describe('Rendu initial', () => {
    it('affiche le dropdown avec les modules actifs', () => {
      render(<ElioDocForm clientId={CLIENT_ID} activeModules={ACTIVE_MODULES} />)

      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByText('core-dashboard')).toBeInTheDocument()
      expect(screen.getByText('crm')).toBeInTheDocument()
      expect(screen.getByText('signature')).toBeInTheDocument()
    })

    it('affiche le champ description', () => {
      render(<ElioDocForm clientId={CLIENT_ID} activeModules={ACTIVE_MODULES} />)
      expect(screen.getByLabelText(/description du module/i)).toBeInTheDocument()
    })

    it('affiche le bouton "Ajouter une FAQ"', () => {
      render(<ElioDocForm clientId={CLIENT_ID} activeModules={ACTIVE_MODULES} />)
      expect(screen.getByText(/ajouter une faq/i)).toBeInTheDocument()
    })

    it('affiche la zone d\'import JSON', () => {
      render(<ElioDocForm clientId={CLIENT_ID} activeModules={ACTIVE_MODULES} />)
      expect(screen.getByLabelText(/import json/i)).toBeInTheDocument()
    })
  })

  describe('Ajout FAQ dynamique', () => {
    it('ajoute un champ FAQ quand on clique sur "Ajouter une FAQ"', async () => {
      const user = userEvent.setup()
      render(<ElioDocForm clientId={CLIENT_ID} activeModules={ACTIVE_MODULES} />)

      await user.click(screen.getByText(/ajouter une faq/i))

      expect(screen.getByPlaceholderText(/question fréquente/i)).toBeInTheDocument()
    })

    it('permet d\'ajouter plusieurs FAQs', async () => {
      const user = userEvent.setup()
      render(<ElioDocForm clientId={CLIENT_ID} activeModules={ACTIVE_MODULES} />)

      await user.click(screen.getByText(/ajouter une faq/i))
      await user.click(screen.getByText(/ajouter une faq/i))

      expect(screen.getAllByPlaceholderText(/question fréquente/i)).toHaveLength(2)
    })
  })

  describe('Import JSON', () => {
    it('remplit le formulaire avec un JSON valide', async () => {
      render(<ElioDocForm clientId={CLIENT_ID} activeModules={ACTIVE_MODULES} />)

      const validJson = JSON.stringify({
        moduleId: 'crm',
        description: 'Module CRM pour gérer les contacts et les opportunités commerciales',
        faq: [{ question: 'Comment créer un contact ?', answer: 'Cliquez sur Nouveau contact' }],
        commonIssues: [],
      })

      const jsonTextarea = screen.getByLabelText(/import json/i)
      fireEvent.change(jsonTextarea, { target: { value: validJson } })

      const importBtn = screen.getByText(/importer le json/i)
      fireEvent.click(importBtn)

      await waitFor(() => {
        expect(
          screen.getByDisplayValue('Module CRM pour gérer les contacts et les opportunités commerciales')
        ).toBeInTheDocument()
      })
    })

    it('affiche une erreur pour un JSON malformé', async () => {
      render(<ElioDocForm clientId={CLIENT_ID} activeModules={ACTIVE_MODULES} />)

      const jsonTextarea = screen.getByLabelText(/import json/i)
      fireEvent.change(jsonTextarea, { target: { value: '{ invalid json }' } })

      fireEvent.click(screen.getByText(/importer le json/i))

      await waitFor(() => {
        expect(screen.getByText(/json malformé/i)).toBeInTheDocument()
      })
    })

    it('affiche une erreur Zod pour un JSON valide mais champs manquants', async () => {
      render(<ElioDocForm clientId={CLIENT_ID} activeModules={ACTIVE_MODULES} />)

      const invalidDoc = JSON.stringify({ moduleId: 'crm' }) // description manquante

      const jsonTextarea = screen.getByLabelText(/import json/i)
      fireEvent.change(jsonTextarea, { target: { value: invalidDoc } })

      fireEvent.click(screen.getByText(/importer le json/i))

      await waitFor(() => {
        expect(screen.getByText(/json invalide/i)).toBeInTheDocument()
      })
    })
  })

  describe('Validation formulaire', () => {
    it('soumet le formulaire avec des données valides', async () => {
      const user = userEvent.setup()
      render(<ElioDocForm clientId={CLIENT_ID} activeModules={ACTIVE_MODULES} />)

      await user.selectOptions(screen.getByRole('combobox'), 'crm')
      await user.type(
        screen.getByLabelText(/description du module/i),
        'Module CRM pour gérer les contacts et les opportunités commerciales'
      )

      await user.click(screen.getByRole('button', { name: /sauvegarder/i }))

      await waitFor(() => {
        expect(mockInjectElioDocumentation).toHaveBeenCalledWith(
          CLIENT_ID,
          expect.objectContaining({
            moduleId: 'crm',
            description: 'Module CRM pour gérer les contacts et les opportunités commerciales',
          })
        )
      })
    })

    it('affiche un toast succès après soumission réussie', async () => {
      const user = userEvent.setup()
      render(<ElioDocForm clientId={CLIENT_ID} activeModules={ACTIVE_MODULES} />)

      await user.selectOptions(screen.getByRole('combobox'), 'crm')
      await user.type(
        screen.getByLabelText(/description du module/i),
        'Description complète du module CRM pour la gestion'
      )

      await user.click(screen.getByRole('button', { name: /sauvegarder/i }))

      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('crm'))
      })
    })

    it('affiche un toast erreur si la soumission échoue', async () => {
      mockInjectElioDocumentation.mockResolvedValueOnce({
        data: null,
        error: { message: 'Erreur serveur', code: 'DATABASE_ERROR' },
      })

      const user = userEvent.setup()
      render(<ElioDocForm clientId={CLIENT_ID} activeModules={ACTIVE_MODULES} />)

      await user.selectOptions(screen.getByRole('combobox'), 'crm')
      await user.type(
        screen.getByLabelText(/description du module/i),
        'Description complète du module CRM pour la gestion'
      )

      await user.click(screen.getByRole('button', { name: /sauvegarder/i }))

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining('Erreur serveur'))
      })
    })
  })
})
