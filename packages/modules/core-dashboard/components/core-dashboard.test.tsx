import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { ClientConfig } from '@monprojetpro/types'
import { CoreDashboard } from './core-dashboard'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

// ── Helpers ─────────────────────────────────────────────────────────────────────

const makeConfig = (overrides: Partial<ClientConfig> = {}): ClientConfig => ({
  id: 'cfg-1',
  clientId: 'client-1',
  dashboardType: 'one',
  activeModules: ['core-dashboard', 'chat', 'documents', 'elio'],
  themeVariant: 'one',
  density: 'comfortable',
  labModeAvailable: false,
  oneModeAvailable: true,
  elioLabEnabled: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CoreDashboard — accueil One (vision v2)', () => {
  it('rend le greeting et la grille « Accès rapide » des modules du socle', () => {
    render(<CoreDashboard clientConfig={makeConfig()} clientName="Camille" />)
    expect(screen.getByText('Bonjour Camille !')).toBeInTheDocument()
    expect(screen.getByLabelText('Accès à tes modules')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ouvrir le module Documents/i })).toBeInTheDocument()
  })

  it('injecte le headerSlot fourni par l’app (bandeau Concierge + cockpit)', () => {
    render(
      <CoreDashboard
        clientConfig={makeConfig()}
        clientName="Camille"
        headerSlot={<div data-testid="header-slot">slot</div>}
      />
    )
    expect(screen.getByTestId('header-slot')).toBeInTheDocument()
  })

  it('affiche un message clair quand seul core-dashboard est actif', () => {
    render(
      <CoreDashboard
        clientConfig={makeConfig({ activeModules: ['core-dashboard'] })}
        clientName="Camille"
      />
    )
    expect(screen.getByText(/Contactez MiKL/i)).toBeInTheDocument()
  })

  it('n’empile plus les anciens blocs redondants (Élio coquille vide, activité statique)', () => {
    render(<CoreDashboard clientConfig={makeConfig()} clientName="Camille" />)
    // L'ancien bloc Élio central et le faux « Activité récente » ont été retirés.
    expect(screen.queryByText('Parler à Élio')).not.toBeInTheDocument()
    expect(screen.queryByText('Activité récente')).not.toBeInTheDocument()
    // Le hero « en chantier » vit désormais dans le layout, plus dans le core-dashboard.
    expect(screen.queryByLabelText('Outil en cours de construction')).not.toBeInTheDocument()
  })
})
