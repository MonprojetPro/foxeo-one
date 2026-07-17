import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { OneAccessToggle } from './one-access-toggle'
import { toggleAccess } from '../actions/toggle-access'

vi.mock('../actions/toggle-access', () => ({
  toggleAccess: vi.fn(),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const CLIENT_ID = '550e8400-e29b-41d4-a716-446655440001'

function renderToggle(oneModeAvailable: boolean) {
  return render(
    <OneAccessToggle clientId={CLIENT_ID} oneModeAvailable={oneModeAvailable} />,
    { wrapper: createWrapper() }
  )
}

describe('OneAccessToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reflète le flag one_mode_available (OFF)', () => {
    renderToggle(false)
    expect(screen.getByTestId('toggle-one')).toHaveAttribute('aria-checked', 'false')
  })

  it('reflète le flag one_mode_available (ON)', () => {
    renderToggle(true)
    expect(screen.getByTestId('toggle-one')).toHaveAttribute('aria-checked', 'true')
  })

  it('active directement sans confirmation', async () => {
    vi.mocked(toggleAccess).mockResolvedValue({
      data: { clientId: CLIENT_ID, accessType: 'one', enabled: true, dashboardType: 'one' },
      error: null,
    })
    renderToggle(false)
    fireEvent.click(screen.getByTestId('toggle-one'))
    await waitFor(() => {
      expect(toggleAccess).toHaveBeenCalledWith({ clientId: CLIENT_ID, accessType: 'one', enabled: true })
    })
  })

  it('demande confirmation à la désactivation', () => {
    renderToggle(true)
    fireEvent.click(screen.getByTestId('toggle-one'))
    expect(toggleAccess).not.toHaveBeenCalled()
    expect(screen.getByText('Désactiver l\'accès One')).toBeInTheDocument()
  })

  it('désactive après confirmation', async () => {
    vi.mocked(toggleAccess).mockResolvedValue({
      data: { clientId: CLIENT_ID, accessType: 'one', enabled: false, dashboardType: 'lab' },
      error: null,
    })
    renderToggle(true)
    fireEvent.click(screen.getByTestId('toggle-one'))
    fireEvent.click(screen.getByText('Confirmer la désactivation'))
    await waitFor(() => {
      expect(toggleAccess).toHaveBeenCalledWith({ clientId: CLIENT_ID, accessType: 'one', enabled: false })
    })
  })
})
