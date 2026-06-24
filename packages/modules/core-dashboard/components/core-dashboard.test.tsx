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

describe('CoreDashboard — cycle de vie visuel One (vision v2)', () => {
  it('affiche le hero "en chantier" quand oneInConstruction = true', () => {
    render(
      <CoreDashboard clientConfig={makeConfig()} clientName="Camille" oneInConstruction />
    )
    // Le hero annonce l'arrivée de l'outil
    expect(screen.getByLabelText('Outil en cours de construction')).toBeInTheDocument()
    expect(screen.getByText(/ton outil arrive/i)).toBeInTheDocument()
    // CTA vers le suivi de l'outil (apostrophe droite ou typographique)
    const link = screen.getByRole('link', { name: /suivre l['’]avancement/i })
    expect(link).toHaveAttribute('href', '/modules/suivi-outil')
  })

  it('le socle reste accessible en mode chantier (modules toujours rendus)', () => {
    render(
      <CoreDashboard clientConfig={makeConfig()} clientName="Camille" oneInConstruction />
    )
    // Section modules présente + cartes du socle (chat, documents…) toujours là
    expect(screen.getByLabelText('Vos modules actifs')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ouvrir le module Documents/i })).toBeInTheDocument()
  })

  it('n’affiche PAS le hero "en chantier" quand oneInConstruction = false (livré)', () => {
    render(
      <CoreDashboard clientConfig={makeConfig()} clientName="Camille" oneInConstruction={false} />
    )
    expect(screen.queryByLabelText('Outil en cours de construction')).not.toBeInTheDocument()
    expect(screen.getByText('Vos modules actifs')).toBeInTheDocument()
  })

  it('par défaut (prop absente) ne montre pas le hero chantier', () => {
    render(<CoreDashboard clientConfig={makeConfig()} clientName="Camille" />)
    expect(screen.queryByLabelText('Outil en cours de construction')).not.toBeInTheDocument()
  })
})
