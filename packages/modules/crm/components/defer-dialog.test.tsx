import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { DeferDialog } from './defer-dialog'

// Mock the action
vi.mock('../actions/defer-client', () => ({
  deferClient: vi.fn(),
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

const clientId = '550e8400-e29b-41d4-a716-446655440001'

describe('DeferDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render dialog title when open', () => {
    render(
      <DeferDialog
        clientId={clientId}
        currentDeferredUntil={null}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('À traiter plus tard')).toBeInTheDocument()
  })

  it('should render date input', () => {
    render(
      <DeferDialog
        clientId={clientId}
        currentDeferredUntil={null}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByTestId('defer-date-input')).toBeInTheDocument()
  })

  it('should disable Valider button when no date selected', () => {
    render(
      <DeferDialog
        clientId={clientId}
        currentDeferredUntil={null}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByTestId('confirm-defer-btn')).toBeDisabled()
  })

  it('should not show "Annuler le report" when no current defer', () => {
    render(
      <DeferDialog
        clientId={clientId}
        currentDeferredUntil={null}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.queryByTestId('clear-defer-btn')).not.toBeInTheDocument()
  })

  it('should show "Annuler le report" when a defer date exists', () => {
    render(
      <DeferDialog
        clientId={clientId}
        currentDeferredUntil="2026-03-01T00:00:00.000Z"
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByTestId('clear-defer-btn')).toBeInTheDocument()
    expect(screen.getByText('Annuler le report')).toBeInTheDocument()
  })

  it('should not render content when dialog is closed', () => {
    render(
      <DeferDialog
        clientId={clientId}
        currentDeferredUntil={null}
        open={false}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.queryByText('À traiter plus tard')).not.toBeInTheDocument()
  })

  it('should have description text about automatic disappearance', () => {
    render(
      <DeferDialog
        clientId={clientId}
        currentDeferredUntil={null}
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText(/disparaîtra automatiquement/)).toBeInTheDocument()
  })
})
