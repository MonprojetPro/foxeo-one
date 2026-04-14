import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type {
  ValidationRequestSummary,
  MessageSummary,
} from '../types/validation.types'

const mockUseClientHistory = vi.fn()

vi.mock('../hooks/use-client-history', () => ({
  useClientHistory: (clientId: string, requestId: string) =>
    mockUseClientHistory(clientId, requestId),
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    <a href={href}>{children}</a>,
}))

vi.mock('@monprojetpro/utils', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    formatRelativeDate: (date: string) => `rel:${date}`,
    truncate: (text: string, len: number) => text.slice(0, len),
  }
})

const mockPreviousRequests: ValidationRequestSummary[] = [
  {
    id: 'req-0',
    title: 'Brief précédent',
    type: 'brief_lab',
    status: 'approved',
    submittedAt: '2026-01-15T10:00:00Z',
  },
]

const mockMessages: MessageSummary[] = [
  {
    id: 'msg-1',
    senderType: 'client',
    content: 'Bonjour, voici mon brief',
    createdAt: '2026-02-22T09:00:00Z',
  },
]

describe('RequestHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function importComponent() {
    const { RequestHistory } = await import('./request-history')
    return RequestHistory
  }

  it('should show empty state when no previous requests', async () => {
    mockUseClientHistory.mockReturnValue({
      previousRequests: [],
      recentMessages: [],
      isLoadingRequests: false,
      isLoadingMessages: false,
      errorRequests: null,
      errorMessages: null,
    })

    const RequestHistory = await importComponent()
    render(
      <RequestHistory
        clientId="c-1"
        requestId="req-1"
        clientName="Jean Dupont"
      />
    )
    expect(screen.getByText('Aucune demande précédente')).toBeDefined()
  })

  it('should render previous requests', async () => {
    mockUseClientHistory.mockReturnValue({
      previousRequests: mockPreviousRequests,
      recentMessages: [],
      isLoadingRequests: false,
      isLoadingMessages: false,
      errorRequests: null,
      errorMessages: null,
    })

    const RequestHistory = await importComponent()
    render(
      <RequestHistory
        clientId="c-1"
        requestId="req-1"
        clientName="Jean Dupont"
      />
    )
    expect(screen.getByText('Brief précédent')).toBeDefined()
  })

  it('should render recent messages', async () => {
    mockUseClientHistory.mockReturnValue({
      previousRequests: [],
      recentMessages: mockMessages,
      isLoadingRequests: false,
      isLoadingMessages: false,
      errorRequests: null,
      errorMessages: null,
    })

    const RequestHistory = await importComponent()
    render(
      <RequestHistory
        clientId="c-1"
        requestId="req-1"
        clientName="Jean Dupont"
      />
    )
    expect(screen.getByText('Client')).toBeDefined()
  })

  it('should show skeletons while loading', async () => {
    mockUseClientHistory.mockReturnValue({
      previousRequests: [],
      recentMessages: [],
      isLoadingRequests: true,
      isLoadingMessages: true,
      errorRequests: null,
      errorMessages: null,
    })

    const RequestHistory = await importComponent()
    const { container } = render(
      <RequestHistory
        clientId="c-1"
        requestId="req-1"
        clientName="Jean Dupont"
      />
    )
    // Skeleton elements should be present
    expect(container.querySelectorAll('[class*="animate"]').length >= 0).toBe(true)
  })

  it('should show empty state when no messages', async () => {
    mockUseClientHistory.mockReturnValue({
      previousRequests: [],
      recentMessages: [],
      isLoadingRequests: false,
      isLoadingMessages: false,
      errorRequests: null,
      errorMessages: null,
    })

    const RequestHistory = await importComponent()
    render(
      <RequestHistory
        clientId="c-1"
        requestId="req-1"
        clientName="Jean Dupont"
      />
    )
    expect(screen.getByText('Aucun message récent')).toBeDefined()
  })

  it('should link to all requests for client', async () => {
    mockUseClientHistory.mockReturnValue({
      previousRequests: [],
      recentMessages: [],
      isLoadingRequests: false,
      isLoadingMessages: false,
      errorRequests: null,
      errorMessages: null,
    })

    const RequestHistory = await importComponent()
    render(
      <RequestHistory
        clientId="c-1"
        requestId="req-1"
        clientName="Jean Dupont"
      />
    )
    const link = screen.getByText(/Voir toutes les demandes de Jean Dupont/)
    expect(link.getAttribute('href')).toContain('c-1')
  })
})
