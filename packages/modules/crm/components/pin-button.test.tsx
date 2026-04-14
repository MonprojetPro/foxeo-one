import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { PinButton } from './pin-button'

// Mock the action
vi.mock('../actions/toggle-pin-client', () => ({
  togglePinClient: vi.fn(),
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

describe('PinButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render pin button', () => {
    render(
      <PinButton clientId={clientId} isPinned={false} />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByTestId(`pin-btn-${clientId}`)).toBeInTheDocument()
  })

  it('should have aria-label for unpinned state', () => {
    render(
      <PinButton clientId={clientId} isPinned={false} />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByLabelText('Épingler le client')).toBeInTheDocument()
  })

  it('should have aria-label for pinned state', () => {
    render(
      <PinButton clientId={clientId} isPinned={true} />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByLabelText('Désépingler le client')).toBeInTheDocument()
  })

  it('should apply primary color when pinned', () => {
    render(
      <PinButton clientId={clientId} isPinned={true} />,
      { wrapper: createWrapper() }
    )

    const btn = screen.getByTestId(`pin-btn-${clientId}`)
    expect(btn).toHaveClass('text-primary')
  })

  it('should apply muted color when unpinned', () => {
    render(
      <PinButton clientId={clientId} isPinned={false} />,
      { wrapper: createWrapper() }
    )

    const btn = screen.getByTestId(`pin-btn-${clientId}`)
    expect(btn).toHaveClass('text-muted-foreground')
  })
})
