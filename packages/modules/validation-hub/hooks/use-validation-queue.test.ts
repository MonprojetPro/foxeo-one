import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useValidationQueue } from './use-validation-queue'
import type { ValidationRequest } from '../types/validation.types'

vi.mock('../actions/get-validation-requests', () => ({
  getValidationRequests: vi.fn(),
}))

const { getValidationRequests } = await import('../actions/get-validation-requests')
const mockGetValidationRequests = vi.mocked(getValidationRequests)

const mockRequests: ValidationRequest[] = [
  {
    id: 'req-1',
    clientId: 'client-1',
    operatorId: 'op-1',
    parcoursId: 'parcours-1',
    stepId: 'step-1',
    type: 'brief_lab',
    title: 'Mon premier brief',
    content: 'Contenu du brief',
    documentIds: [],
    status: 'pending',
    reviewerComment: null,
    submittedAt: '2026-02-20T10:00:00Z',
    reviewedAt: null,
    createdAt: '2026-02-20T10:00:00Z',
    updatedAt: '2026-02-20T10:00:00Z',
    client: {
      id: 'client-1',
      name: 'Jean Dupont',
      company: 'Acme Corp',
      clientType: 'complet',
      avatarUrl: null,
    },
  },
  {
    id: 'req-2',
    clientId: 'client-2',
    operatorId: 'op-1',
    parcoursId: null,
    stepId: null,
    type: 'evolution_one',
    title: 'Évolution module',
    content: 'Description de l\'évolution',
    documentIds: ['doc-1'],
    status: 'approved',
    reviewerComment: 'Validé avec commentaire',
    submittedAt: '2026-02-21T14:00:00Z',
    reviewedAt: '2026-02-22T09:00:00Z',
    createdAt: '2026-02-21T14:00:00Z',
    updatedAt: '2026-02-22T09:00:00Z',
    client: {
      id: 'client-2',
      name: 'Marie Martin',
      company: null,
      clientType: 'direct_one',
      avatarUrl: null,
    },
  },
]

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useValidationQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return requests when data loads successfully', async () => {
    mockGetValidationRequests.mockResolvedValue({
      data: mockRequests,
      error: null,
    })

    const { result } = renderHook(() => useValidationQueue(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.requests).toHaveLength(2)
    expect(result.current.requests[0].id).toBe('req-1')
    expect(result.current.error).toBeNull()
  })

  it('should compute pendingCount correctly', async () => {
    mockGetValidationRequests.mockResolvedValue({
      data: mockRequests,
      error: null,
    })

    const { result } = renderHook(() => useValidationQueue(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Only req-1 is pending
    expect(result.current.pendingCount).toBe(1)
  })

  it('should return error when action fails', async () => {
    mockGetValidationRequests.mockResolvedValue({
      data: null,
      error: { message: 'Erreur DB', code: 'DATABASE_ERROR' },
    })

    const { result } = renderHook(() => useValidationQueue(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).not.toBeNull()
    expect(result.current.error?.message).toBe('Erreur DB')
    expect(result.current.requests).toHaveLength(0)
  })

  it('should expose default filters', () => {
    mockGetValidationRequests.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useValidationQueue(), {
      wrapper: createWrapper(),
    })

    expect(result.current.filters.status).toBe('all')
    expect(result.current.filters.type).toBe('all')
    expect(result.current.filters.sortBy).toBe('submitted_at')
    // Tri par defaut : la plus recente d'abord. Choix produit du 2026-06-02
    // (commit 1f64318, retours de test MiKL) — le test decrivait l'ordre initial.
    expect(result.current.filters.sortOrder).toBe('desc')
  })

  it('should update filters when setFilters is called', async () => {
    mockGetValidationRequests.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useValidationQueue(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.setFilters({ status: 'pending' })
    })

    expect(result.current.filters.status).toBe('pending')
    expect(result.current.filters.type).toBe('all') // unchanged
  })

  it('should return empty array when no data', async () => {
    mockGetValidationRequests.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useValidationQueue(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.requests).toHaveLength(0)
    expect(result.current.pendingCount).toBe(0)
  })
})
