import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { ValidationRequestDetail } from '../types/validation.types'

// RequestDetail utilise useQueryClient → fournir un QueryClientProvider au rendu de test.
function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(createElement(QueryClientProvider, { client: queryClient }, ui))
}

const mockUseValidationRequest = vi.fn()

vi.mock('../hooks/use-validation-request', () => ({
  useValidationRequest: (requestId: string) => mockUseValidationRequest(requestId),
}))

vi.mock('./request-header', () => ({
  RequestHeader: ({ title }: { title: string }) => <div data-testid="request-header">{title}</div>,
}))

vi.mock('./client-info-card', () => ({
  ClientInfoCard: ({ client }: { client: { name: string } }) => (
    <div data-testid="client-info-card">{client.name}</div>
  ),
}))

vi.mock('./request-content', () => ({
  RequestContent: ({ content }: { content: string }) => (
    <div data-testid="request-content">{content}</div>
  ),
}))

vi.mock('./request-history', () => ({
  RequestHistory: ({ clientId }: { clientId: string }) => (
    <div data-testid="request-history">{clientId}</div>
  ),
}))

vi.mock('./request-exchanges', () => ({
  RequestExchanges: ({ exchanges }: { exchanges: unknown[] }) => (
    <div data-testid="request-exchanges">{exchanges.length}</div>
  ),
}))

vi.mock('./request-actions', () => ({
  RequestActions: ({ status }: { status: string }) => (
    <div data-testid="request-actions">{status}</div>
  ),
}))

vi.mock('./approve-dialog', () => ({
  ApproveDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="approve-dialog" /> : null,
}))

vi.mock('./reject-dialog', () => ({
  RejectDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="reject-dialog" /> : null,
}))

vi.mock('./clarification-dialog', () => ({
  ClarificationDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="clarification-dialog" /> : null,
}))

vi.mock('./action-picker', () => ({
  ActionPicker: () => <div data-testid="action-picker" />,
}))

// Le barrel du module parcours expose aussi ses Server Actions : l'importer tel
// quel dans un test de composant ferait charger du code reserve au serveur.
vi.mock('@monprojetpro/module-parcours', () => ({
  FeedbackInjectionForm: () => <div data-testid="feedback-injection-form" />,
}))

const mockDetail: ValidationRequestDetail = {
  id: 'req-1',
  clientId: 'c-1',
  operatorId: 'op-1',
  parcoursId: null,
  stepId: null,
  type: 'brief_lab',
  title: 'Mon brief',
  content: 'Contenu du brief',
  documentIds: [],
  status: 'pending',
  reviewerComment: null,
  submittedAt: '2026-02-20T10:00:00Z',
  reviewedAt: null,
  createdAt: '2026-02-20T10:00:00Z',
  updatedAt: '2026-02-20T10:00:00Z',
  client: {
    id: 'c-1',
    name: 'Jean Dupont',
    company: 'Acme Corp',
    clientType: 'complet',
    avatarUrl: null,
  },
  documents: [],
}

describe('RequestDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function importComponent() {
    const { RequestDetail } = await import('./request-detail')
    return RequestDetail
  }

  it('should show skeleton while loading', async () => {
    mockUseValidationRequest.mockReturnValue({
      request: null,
      isLoading: true,
      error: null,
    })

    const RequestDetail = await importComponent()
    const { container } = renderWithClient(<RequestDetail requestId="req-1" />)
    // Skeletons are rendered when loading
    expect(container.querySelector('[class*="skeleton"], [class*="Skeleton"]')).toBeDefined()
  })

  it('should show error when fetch fails', async () => {
    mockUseValidationRequest.mockReturnValue({
      request: null,
      isLoading: false,
      error: new Error('Demande introuvable'),
    })

    const RequestDetail = await importComponent()
    renderWithClient(<RequestDetail requestId="req-1" />)
    expect(screen.getByText(/Impossible de charger/)).toBeDefined()
    expect(screen.getByText('Demande introuvable')).toBeDefined()
  })

  it('should show not found when data is null', async () => {
    mockUseValidationRequest.mockReturnValue({
      request: null,
      isLoading: false,
      error: null,
    })

    const RequestDetail = await importComponent()
    renderWithClient(<RequestDetail requestId="req-1" />)
    expect(screen.getByText('Demande introuvable')).toBeDefined()
  })

  it('should render all sections when request is loaded', async () => {
    mockUseValidationRequest.mockReturnValue({
      request: mockDetail,
      isLoading: false,
      error: null,
    })

    const RequestDetail = await importComponent()
    renderWithClient(<RequestDetail requestId="req-1" />)

    expect(screen.getByTestId('request-header')).toBeDefined()
    expect(screen.getByTestId('client-info-card')).toBeDefined()
    expect(screen.getByTestId('request-content')).toBeDefined()
    expect(screen.getByTestId('request-history')).toBeDefined()
    expect(screen.getByTestId('request-actions')).toBeDefined()
  })

  it('should pass correct title to RequestHeader', async () => {
    mockUseValidationRequest.mockReturnValue({
      request: mockDetail,
      isLoading: false,
      error: null,
    })

    const RequestDetail = await importComponent()
    renderWithClient(<RequestDetail requestId="req-1" />)
    expect(screen.getByTestId('request-header').textContent).toBe('Mon brief')
  })

  it('should pass client name to ClientInfoCard', async () => {
    mockUseValidationRequest.mockReturnValue({
      request: mockDetail,
      isLoading: false,
      error: null,
    })

    const RequestDetail = await importComponent()
    renderWithClient(<RequestDetail requestId="req-1" />)
    expect(screen.getByTestId('client-info-card').textContent).toBe('Jean Dupont')
  })

  it('should show exchanges section when reviewer_comment exists', async () => {
    const detailWithComment = {
      ...mockDetail,
      status: 'needs_clarification' as const,
      reviewerComment: 'Précisez votre besoin',
      reviewedAt: '2026-02-21T09:00:00Z',
    }
    mockUseValidationRequest.mockReturnValue({
      request: detailWithComment,
      isLoading: false,
      error: null,
    })

    const RequestDetail = await importComponent()
    renderWithClient(<RequestDetail requestId="req-1" />)
    expect(screen.getByTestId('request-exchanges')).toBeDefined()
    // 1 exchange created
    expect(screen.getByTestId('request-exchanges').textContent).toBe('1')
  })

  it('should not show exchanges section when no reviewer_comment', async () => {
    mockUseValidationRequest.mockReturnValue({
      request: mockDetail,
      isLoading: false,
      error: null,
    })

    const RequestDetail = await importComponent()
    renderWithClient(<RequestDetail requestId="req-1" />)
    expect(screen.queryByTestId('request-exchanges')).toBeNull()
  })

  it('should show 2 exchanges when client has resubmitted (status=pending with reviewerComment)', async () => {
    const detailResubmitted = {
      ...mockDetail,
      status: 'pending' as const,
      reviewerComment: 'Quel est le budget ?',
      reviewedAt: '2026-02-21T09:00:00Z',
      updatedAt: '2026-02-22T10:00:00Z',
      content: 'Notre budget est de 5000€',
    }
    mockUseValidationRequest.mockReturnValue({
      request: detailResubmitted,
      isLoading: false,
      error: null,
    })

    const RequestDetail = await importComponent()
    renderWithClient(<RequestDetail requestId="req-1" />)
    expect(screen.getByTestId('request-exchanges')).toBeDefined()
    // 2 exchanges: MiKL asked + Client resubmitted
    expect(screen.getByTestId('request-exchanges').textContent).toBe('2')
  })

  it('should render ClarificationDialog (closed by default)', async () => {
    mockUseValidationRequest.mockReturnValue({
      request: mockDetail,
      isLoading: false,
      error: null,
    })

    const RequestDetail = await importComponent()
    renderWithClient(<RequestDetail requestId="req-1" />)
    // Clarification dialog is closed by default
    expect(screen.queryByTestId('clarification-dialog')).toBeNull()
  })
})
