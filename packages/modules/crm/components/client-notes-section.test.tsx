import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ClientNotesSection } from './client-notes-section'

const mockNotes = [
  {
    id: '550e8400-e29b-41d4-a716-446655440010',
    clientId: '550e8400-e29b-41d4-a716-446655440001',
    operatorId: '550e8400-e29b-41d4-a716-446655440099',
    content: 'Première note',
    createdAt: '2026-02-10T10:00:00.000Z',
    updatedAt: '2026-02-10T10:00:00.000Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011',
    clientId: '550e8400-e29b-41d4-a716-446655440001',
    operatorId: '550e8400-e29b-41d4-a716-446655440099',
    content: 'Deuxième note',
    createdAt: '2026-02-09T10:00:00.000Z',
    updatedAt: '2026-02-09T10:00:00.000Z',
  },
]

// Mock the hook
const mockUseClientNotes = vi.fn()
vi.mock('../hooks/use-client-notes', () => ({
  useClientNotes: (...args: unknown[]) => mockUseClientNotes(...args),
}))

// Mock actions
vi.mock('../actions/create-client-note', () => ({
  createClientNote: vi.fn(),
}))

// Mock toast functions
vi.mock('@monprojetpro/ui', async () => {
  const actual = await vi.importActual('@monprojetpro/ui')
  return {
    ...actual,
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }
})

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('ClientNotesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render section title "Notes privées"', () => {
    mockUseClientNotes.mockReturnValue({ data: [], isPending: false })

    render(
      <ClientNotesSection clientId="550e8400-e29b-41d4-a716-446655440001" />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('Notes privées')).toBeInTheDocument()
  })

  it('should show "Privé" badge in header', () => {
    mockUseClientNotes.mockReturnValue({ data: [], isPending: false })

    render(
      <ClientNotesSection clientId="550e8400-e29b-41d4-a716-446655440001" />,
      { wrapper: createWrapper() }
    )

    // The header badge
    expect(screen.getAllByText('Privé').length).toBeGreaterThanOrEqual(1)
  })

  it('should render add note textarea and button', () => {
    mockUseClientNotes.mockReturnValue({ data: [], isPending: false })

    render(
      <ClientNotesSection clientId="550e8400-e29b-41d4-a716-446655440001" />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByTestId('new-note-textarea')).toBeInTheDocument()
    expect(screen.getByTestId('add-note-btn')).toBeInTheDocument()
  })

  it('should show empty message when no notes', () => {
    mockUseClientNotes.mockReturnValue({ data: [], isPending: false })

    render(
      <ClientNotesSection clientId="550e8400-e29b-41d4-a716-446655440001" />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByTestId('notes-empty')).toBeInTheDocument()
    expect(screen.getByText('Aucune note privée pour ce client.')).toBeInTheDocument()
  })

  it('should show loading skeletons when pending', () => {
    mockUseClientNotes.mockReturnValue({ data: undefined, isPending: true })

    render(
      <ClientNotesSection clientId="550e8400-e29b-41d4-a716-446655440001" />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByTestId('notes-loading')).toBeInTheDocument()
  })

  it('should render notes list when notes exist', () => {
    mockUseClientNotes.mockReturnValue({ data: mockNotes, isPending: false })

    render(
      <ClientNotesSection clientId="550e8400-e29b-41d4-a716-446655440001" />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByTestId('notes-list')).toBeInTheDocument()
    expect(screen.getByText('Première note')).toBeInTheDocument()
    expect(screen.getByText('Deuxième note')).toBeInTheDocument()
  })

  it('should disable add button when textarea is empty', () => {
    mockUseClientNotes.mockReturnValue({ data: [], isPending: false })

    render(
      <ClientNotesSection clientId="550e8400-e29b-41d4-a716-446655440001" />,
      { wrapper: createWrapper() }
    )

    const addBtn = screen.getByTestId('add-note-btn')
    expect(addBtn).toBeDisabled()
  })

  it('should have correct data-testid', () => {
    mockUseClientNotes.mockReturnValue({ data: [], isPending: false })

    render(
      <ClientNotesSection clientId="550e8400-e29b-41d4-a716-446655440001" />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByTestId('client-notes-section')).toBeInTheDocument()
  })
})
