import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ClientNoteCard } from './client-note-card'
import type { ClientNote } from '../types/crm.types'

// Mock actions
vi.mock('../actions/update-client-note', () => ({
  updateClientNote: vi.fn(),
}))

vi.mock('../actions/delete-client-note', () => ({
  deleteClientNote: vi.fn(),
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

const mockNote: ClientNote = {
  id: '550e8400-e29b-41d4-a716-446655440010',
  clientId: '550e8400-e29b-41d4-a716-446655440001',
  operatorId: '550e8400-e29b-41d4-a716-446655440099',
  content: 'Ceci est une note de test',
  createdAt: '2026-02-10T10:00:00.000Z',
  updatedAt: '2026-02-10T10:00:00.000Z',
}

describe('ClientNoteCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render note content', () => {
    render(
      <ClientNoteCard note={mockNote} clientId={mockNote.clientId} />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('Ceci est une note de test')).toBeInTheDocument()
  })

  it('should show "Privé" badge', () => {
    render(
      <ClientNoteCard note={mockNote} clientId={mockNote.clientId} />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('Privé')).toBeInTheDocument()
  })

  it('should show creation date', () => {
    render(
      <ClientNoteCard note={mockNote} clientId={mockNote.clientId} />,
      { wrapper: createWrapper() }
    )

    // The date should be formatted in French locale
    expect(screen.getByText(/10 févr. 2026/)).toBeInTheDocument()
  })

  it('should have Modifier and Supprimer buttons', () => {
    render(
      <ClientNoteCard note={mockNote} clientId={mockNote.clientId} />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByTestId('edit-note-btn')).toBeInTheDocument()
    expect(screen.getByTestId('delete-note-btn')).toBeInTheDocument()
  })

  it('should switch to edit mode when Modifier clicked', () => {
    render(
      <ClientNoteCard note={mockNote} clientId={mockNote.clientId} />,
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByTestId('edit-note-btn'))

    expect(screen.getByTestId('edit-note-textarea')).toBeInTheDocument()
    expect(screen.getByText('Sauvegarder')).toBeInTheDocument()
    expect(screen.getByText('Annuler')).toBeInTheDocument()
  })

  it('should restore original content when cancelling edit', () => {
    render(
      <ClientNoteCard note={mockNote} clientId={mockNote.clientId} />,
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByTestId('edit-note-btn'))

    const textarea = screen.getByTestId('edit-note-textarea')
    fireEvent.change(textarea, { target: { value: 'Modified content' } })

    fireEvent.click(screen.getByText('Annuler'))

    // Should show original content again
    expect(screen.getByText('Ceci est une note de test')).toBeInTheDocument()
  })

  it('should show confirmation dialog when Supprimer clicked', () => {
    render(
      <ClientNoteCard note={mockNote} clientId={mockNote.clientId} />,
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByTestId('delete-note-btn'))

    expect(screen.getByText('Supprimer cette note ?')).toBeInTheDocument()
    expect(screen.getByText(/irréversible/)).toBeInTheDocument()
  })

  it('should have correct data-testid', () => {
    render(
      <ClientNoteCard note={mockNote} clientId={mockNote.clientId} />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByTestId(`note-card-${mockNote.id}`)).toBeInTheDocument()
  })
})
