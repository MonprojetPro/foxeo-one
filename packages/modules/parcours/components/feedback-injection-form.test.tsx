import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { FeedbackInjectionForm } from './feedback-injection-form'

const mockCreateFeedbackInjection = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()
const mockInvalidateQueries = vi.fn()

vi.mock('../actions/create-feedback-injection', () => ({
  createFeedbackInjection: (...args: unknown[]) => mockCreateFeedbackInjection(...args),
}))

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    showSuccess: (...args: unknown[]) => mockShowSuccess(...args),
    showError: (...args: unknown[]) => mockShowError(...args),
    Textarea: ({ id, value, onChange, placeholder, rows, maxLength, 'aria-required': ar }: {
      id: string
      value: string
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
      placeholder?: string
      rows?: number
      maxLength?: number
      'aria-required'?: string
    }) =>
      createElement('textarea', { id, value, onChange, placeholder, rows, maxLength, 'aria-required': ar }),
  }
})

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  }
})

const STEP_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const CLIENT_ID = 'bbbbbbbb-0000-0000-0000-000000000002'

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('FeedbackInjectionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche les deux options radio', () => {
    render(
      createElement(FeedbackInjectionForm, { stepId: STEP_ID, clientId: CLIENT_ID }),
      { wrapper }
    )
    expect(screen.getByLabelText('Feedback texte')).toBeInTheDocument()
    expect(screen.getByLabelText('Injecter questions dans Élio')).toBeInTheDocument()
  })

  it('désactive le bouton si le contenu est vide', () => {
    render(
      createElement(FeedbackInjectionForm, { stepId: STEP_ID, clientId: CLIENT_ID }),
      { wrapper }
    )
    const btn = screen.getByRole('button', { name: /envoyer le feedback/i })
    expect(btn).toBeDisabled()
  })

  it('active le bouton quand du contenu est saisi', () => {
    render(
      createElement(FeedbackInjectionForm, { stepId: STEP_ID, clientId: CLIENT_ID }),
      { wrapper }
    )
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Mon feedback' } })
    const btn = screen.getByRole('button', { name: /envoyer le feedback/i })
    expect(btn).not.toBeDisabled()
  })

  it('soumet avec text_feedback par défaut et affiche un toast succès', async () => {
    mockCreateFeedbackInjection.mockResolvedValue({ data: { injectionId: 'xyz' }, error: null })

    render(
      createElement(FeedbackInjectionForm, { stepId: STEP_ID, clientId: CLIENT_ID }),
      { wrapper }
    )
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Excellent travail' } })
    fireEvent.click(screen.getByRole('button', { name: /envoyer le feedback/i }))

    await waitFor(() => {
      expect(mockCreateFeedbackInjection).toHaveBeenCalledWith({
        stepId: STEP_ID,
        clientId: CLIENT_ID,
        content: 'Excellent travail',
        type: 'text_feedback',
      })
      expect(mockShowSuccess).toHaveBeenCalled()
    })
  })

  it('change le label du bouton quand "Injecter questions dans Élio" est sélectionné', () => {
    render(
      createElement(FeedbackInjectionForm, { stepId: STEP_ID, clientId: CLIENT_ID }),
      { wrapper }
    )
    const radioElio = screen.getByLabelText('Injecter questions dans Élio')
    fireEvent.click(radioElio)
    expect(screen.getByRole('button', { name: /injecter dans élio/i })).toBeInTheDocument()
  })

  it('affiche une erreur si l\'action échoue', async () => {
    mockCreateFeedbackInjection.mockResolvedValue({
      data: null,
      error: { message: 'Accès refusé', code: 'FORBIDDEN' },
    })

    render(
      createElement(FeedbackInjectionForm, { stepId: STEP_ID, clientId: CLIENT_ID }),
      { wrapper }
    )
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Test' } })
    fireEvent.click(screen.getByRole('button', { name: /envoyer le feedback/i }))

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Accès refusé')
    })
  })

  it('affiche le numéro d\'étape dans le label si stepNumber fourni', () => {
    render(
      createElement(FeedbackInjectionForm, { stepId: STEP_ID, clientId: CLIENT_ID, stepNumber: 3 }),
      { wrapper }
    )
    expect(screen.getByText(/Type de message pour Étape 3/)).toBeInTheDocument()
  })
})
