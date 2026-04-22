import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { GenerateDocumentButton } from './generate-document-button'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGenerateDocument = vi.fn()
const mockSubmitDocument = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()
const mockUseStepSubmissionStatus = vi.fn()

vi.mock('../actions/generate-and-submit-step', () => ({
  generateDocumentFromConversation: (...args: unknown[]) => mockGenerateDocument(...args),
}))
vi.mock('../actions/submit-generated-document', () => ({
  submitGeneratedDocument: (...args: unknown[]) => mockSubmitDocument(...args),
}))
vi.mock('@monprojetpro/ui', () => ({
  showSuccess: (...args: unknown[]) => mockShowSuccess(...args),
  showError: (...args: unknown[]) => mockShowError(...args),
}))
vi.mock('../hooks/use-step-submission-status', () => ({
  useStepSubmissionStatus: (...args: unknown[]) => mockUseStepSubmissionStatus(...args),
}))
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => createElement('div', { 'data-testid': 'markdown' }, children),
}))
vi.mock('remark-gfm', () => ({ default: () => {} }))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return createElement(QueryClientProvider, { client: queryClient }, children)
}

const baseProps = {
  stepId: '00000000-0000-0000-0000-000000000010',
  stepStatus: 'current' as const,
  clientId: '00000000-0000-0000-0000-000000000002',
  messageCount: 5,
  stepNumber: 2,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GenerateDocumentButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseStepSubmissionStatus.mockReturnValue({ hasPending: false, isLoading: false })
  })

  it('renders the generate button when conditions are met', () => {
    render(createElement(GenerateDocumentButton, baseProps), { wrapper })
    expect(screen.getByRole('button', { name: /Générer mon document/i })).toBeDefined()
  })

  it('shows disabled button when messageCount < 3', () => {
    render(createElement(GenerateDocumentButton, { ...baseProps, messageCount: 2 }), { wrapper })
    const btn = screen.getByRole('button')
    expect(btn.hasAttribute('disabled')).toBe(true)
  })

  it('shows disabled button when step is not current', () => {
    render(createElement(GenerateDocumentButton, { ...baseProps, stepStatus: 'locked' as const }), { wrapper })
    const btn = screen.getByRole('button')
    expect(btn.hasAttribute('disabled')).toBe(true)
  })

  it('shows pending indicator when hasPending is true', () => {
    mockUseStepSubmissionStatus.mockReturnValue({ hasPending: true, isLoading: false })
    render(createElement(GenerateDocumentButton, baseProps), { wrapper })
    expect(screen.getByText(/Soumission en cours d'examen/i)).toBeDefined()
  })

  it('shows confirmation dialog on button click', () => {
    render(createElement(GenerateDocumentButton, baseProps), { wrapper })
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText(/Es-tu sûr d'avoir bien cerné le sujet/i)).toBeDefined()
    expect(screen.getByText('Oui, je suis prêt')).toBeDefined()
    expect(screen.getByText('Non, continuer')).toBeDefined()
  })

  it('returns to idle state when "Non, continuer" is clicked', () => {
    render(createElement(GenerateDocumentButton, baseProps), { wrapper })
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Non, continuer'))
    expect(screen.getByRole('button', { name: /Générer mon document/i })).toBeDefined()
  })

  it('shows loading state when "Oui, je suis prêt" is clicked', async () => {
    mockGenerateDocument.mockResolvedValue({ data: { document: '## Doc' }, error: null })
    render(createElement(GenerateDocumentButton, baseProps), { wrapper })
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Oui, je suis prêt'))
    expect(screen.getByText(/Élio rédige votre document/i)).toBeDefined()
  })

  it('shows preview with document content after generation', async () => {
    mockGenerateDocument.mockResolvedValue({ data: { document: '## Mon Document\n\nContenu.' }, error: null })
    render(createElement(GenerateDocumentButton, baseProps), { wrapper })
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Oui, je suis prêt'))
    await waitFor(() => screen.getByText("Aperçu de votre document"))
    expect(screen.getByText("Confirmer l'envoi")).toBeDefined()
    expect(screen.getByText('Annuler')).toBeDefined()
  })

  it('shows error and returns to confirmation on generation failure', async () => {
    mockGenerateDocument.mockResolvedValue({ data: null, error: { message: 'API error', code: 'API_ERROR' } })
    render(createElement(GenerateDocumentButton, baseProps), { wrapper })
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Oui, je suis prêt'))
    await waitFor(() => screen.getByText('Oui, je suis prêt'))
    expect(mockShowError).toHaveBeenCalledWith('API error')
  })

  it('submits document and shows success toast', async () => {
    mockGenerateDocument.mockResolvedValue({ data: { document: '## Doc' }, error: null })
    mockSubmitDocument.mockResolvedValue({ data: { submissionId: 'sub-1' }, error: null })
    render(createElement(GenerateDocumentButton, baseProps), { wrapper })
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Oui, je suis prêt'))
    await waitFor(() => screen.getByText("Confirmer l'envoi"))
    fireEvent.click(screen.getByText("Confirmer l'envoi"))
    await waitFor(() => mockShowSuccess.mock.calls.length > 0)
    expect(mockShowSuccess).toHaveBeenCalledWith('Votre document a été soumis à MiKL !')
  })

  it('shows submitted state after successful submission', async () => {
    mockGenerateDocument.mockResolvedValue({ data: { document: '## Doc' }, error: null })
    mockSubmitDocument.mockResolvedValue({ data: { submissionId: 'sub-1' }, error: null })
    render(createElement(GenerateDocumentButton, baseProps), { wrapper })
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Oui, je suis prêt'))
    await waitFor(() => screen.getByText("Confirmer l'envoi"))
    fireEvent.click(screen.getByText("Confirmer l'envoi"))
    await waitFor(() => screen.getByText(/Soumission en cours d'examen/i))
  })
})
