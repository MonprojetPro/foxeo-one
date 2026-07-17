import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AccessToggles } from './access-toggles'

// Mock the toggle action
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

// Profil Lab actif : espace Lab présent, agents actifs
function renderLab(hasActiveParcours = false) {
  return render(
    <AccessToggles
      clientId={CLIENT_ID}
      labModeAvailable
      elioLabEnabled
      hasActiveParcours={hasActiveParcours}
    />,
    { wrapper: createWrapper() }
  )
}

describe('AccessToggles', () => {
  it('rend le levier Agents du parcours (le levier One vit dans le panneau Dashboard One)', () => {
    renderLab()
    expect(screen.getByText('Agents du parcours')).toBeInTheDocument()
    expect(screen.queryByText('Accès One')).not.toBeInTheDocument()
  })

  it('rend 1 seule switch', () => {
    renderLab()
    expect(screen.getAllByRole('switch')).toHaveLength(1)
  })

  it('reflète le vrai flag : agents ON (elioLabEnabled)', () => {
    renderLab()
    expect(screen.getByTestId('toggle-lab')).toHaveAttribute('aria-checked', 'true')
  })

  it('agents OFF quand elioLabEnabled=false', () => {
    render(
      <AccessToggles clientId={CLIENT_ID} labModeAvailable elioLabEnabled={false} hasActiveParcours={false} />,
      { wrapper: createWrapper() }
    )
    expect(screen.getByTestId('toggle-lab')).toHaveAttribute('aria-checked', 'false')
  })

  it('affiche le statut « Espace Lab » permanent (lecture seule)', () => {
    renderLab()
    expect(screen.getByText(/Espace Lab/)).toBeInTheDocument()
    expect(screen.getByText(/statut, lecture seule/)).toBeInTheDocument()
    expect(screen.getByText(/l’historique reste accessible/)).toBeInTheDocument()
  })

  it('confirmation à la coupure des agents du parcours', () => {
    renderLab()
    fireEvent.click(screen.getByTestId('toggle-lab'))
    expect(screen.getByText('Désactiver les agents du parcours')).toBeInTheDocument()
  })

  it('mentionne la suspension du parcours si un parcours est actif', () => {
    renderLab(true)
    fireEvent.click(screen.getByTestId('toggle-lab'))
    expect(screen.getByText(/parcours en cours sera suspendu/)).toBeInTheDocument()
  })

  it('a le data-testid access-toggles + titre', () => {
    renderLab()
    expect(screen.getByTestId('access-toggles')).toBeInTheDocument()
    expect(screen.getByText('Accès Lab')).toBeInTheDocument()
  })
})
