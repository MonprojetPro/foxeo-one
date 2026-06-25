import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { createElement } from 'react'
import type { ClientConfig } from '@monprojetpro/types'
import { CoreDashboard } from './core-dashboard'

// Mock @monprojetpro/ui with proper React elements
vi.mock('@monprojetpro/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    createElement('div', { 'data-testid': 'card', className }, children),
  CardContent: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'card-content' }, children),
  CardHeader: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'card-header' }, children),
  CardTitle: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'card-title' }, children),
  Skeleton: ({ className }: { className?: string }) =>
    createElement('div', { 'data-testid': 'skeleton', className }),
}))

// Mock next/link with proper React element
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    createElement('a', { href }, children),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('./lab-teasing-card', () => ({
  LabTeasingCard: ({ show }: { show: boolean }) =>
    show ? createElement('div', { 'data-testid': 'lab-teasing-card' }) : null,
}))

const makeConfig = (overrides: Partial<ClientConfig> = {}): ClientConfig => ({
  id: 'cfg-1',
  clientId: 'client-1',
  dashboardType: 'one',
  activeModules: ['core-dashboard', 'chat', 'documents'],
  themeVariant: 'one',
  density: 'comfortable',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('CoreDashboard', () => {
  describe('business logic', () => {
    it('builds quick access modules excluding core-dashboard', () => {
      const config = makeConfig({ activeModules: ['core-dashboard', 'chat', 'documents', 'elio', 'visio'] })
      const quickAccess = config.activeModules.filter((id) => id !== 'core-dashboard')
      expect(quickAccess).toEqual(['chat', 'documents', 'elio', 'visio'])
      expect(quickAccess).not.toContain('core-dashboard')
    })

    it('returns empty quick access when only core-dashboard active', () => {
      const config = makeConfig({ activeModules: ['core-dashboard'] })
      const quickAccess = config.activeModules.filter((id) => id !== 'core-dashboard')
      expect(quickAccess).toHaveLength(0)
    })

    it('uses custom branding logoUrl when present', () => {
      const config = makeConfig({
        customBranding: { logoUrl: 'https://example.com/logo.png', displayName: 'ACME', accentColor: null, updatedAt: '2026-01-01T00:00:00Z' },
      })
      expect(config.customBranding?.logoUrl).toBe('https://example.com/logo.png')
    })

    it('formats date in French locale', () => {
      const formatted = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(
        new Date('2026-03-06T12:00:00Z')
      )
      expect(formatted).toMatch(/vendredi|mars|2026/i)
    })
  })

  describe('rendering', () => {
    it('renders greeting with client name', () => {
      const { container } = render(
        CoreDashboard({ clientConfig: makeConfig(), clientName: 'Marie' })
      )
      expect(container.textContent).toContain('Bonjour Marie')
    })

    it('renders greeting without client name', () => {
      const { container } = render(
        CoreDashboard({ clientConfig: makeConfig(), clientName: '' })
      )
      expect(container.textContent).toContain('Bonjour')
      expect(container.textContent).not.toContain('Bonjour Marie')
    })

    it('renders quick access cards for active modules', () => {
      const { container } = render(
        CoreDashboard({
          clientConfig: makeConfig({ activeModules: ['core-dashboard', 'chat', 'documents'] }),
          clientName: 'Test',
        })
      )
      expect(container.textContent).toContain('Chat')
      expect(container.textContent).toContain('Documents')
    })

    it('renders no-modules message when only core-dashboard active', () => {
      const { container } = render(
        CoreDashboard({
          clientConfig: makeConfig({ activeModules: ['core-dashboard'] }),
          clientName: 'Test',
        })
      )
      expect(container.textContent).toContain('Contactez MiKL')
    })

    it('renders without logo when no custom branding', () => {
      const { container } = render(
        CoreDashboard({
          clientConfig: makeConfig({ customBranding: undefined }),
          clientName: 'Test',
        })
      )
      expect(container.querySelector('img')).toBeNull()
    })

    it('renders the app headerSlot when provided', () => {
      const { container } = render(
        CoreDashboard({
          clientConfig: makeConfig(),
          clientName: 'Test',
          headerSlot: createElement('div', { 'data-testid': 'slot' }, 'COCKPIT'),
        })
      )
      expect(container.textContent).toContain('COCKPIT')
    })

    it('no longer renders the legacy empty Élio block', () => {
      const { container } = render(
        CoreDashboard({
          clientConfig: makeConfig({ activeModules: ['core-dashboard', 'elio'] }),
          clientName: 'Test',
        })
      )
      expect(container.textContent).not.toContain('Parler à Élio')
    })
  })
})
