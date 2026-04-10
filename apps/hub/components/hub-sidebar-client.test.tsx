import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HubSidebarClient } from './hub-sidebar-client'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/modules/validation-hub'),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock validation badge hook
const mockUseValidationBadge = vi.fn(() => ({
  pendingCount: 0,
  isLoading: false,
}))
vi.mock('@monprojetpro/modules-validation-hub', () => ({
  useValidationBadge: (...args: unknown[]) => mockUseValidationBadge(...args),
}))

// Mock ElioQueryBox to avoid loading @monprojetpro/module-elio
vi.mock('./elio-query-box', () => ({
  ElioQueryBox: () => null,
}))

// Mock @monprojetpro/ui to avoid loading Radix/shadcn in happy-dom
vi.mock('@monprojetpro/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}))

// Mock @monprojetpro/utils
vi.mock('@monprojetpro/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}))

// Mock lucide-react avec importOriginal pour exposer tous les exports réels
vi.mock('lucide-react', async (importOriginal) => {
  const MockIcon = ({ className }: { className?: string }) => (
    <span data-testid="icon" className={className} />
  )
  const actual = await importOriginal<typeof import('lucide-react')>()
  return {
    ...actual,
    Home: MockIcon,
    Users: MockIcon,
    CheckCircle: MockIcon,
    Calendar: MockIcon,
    MessageSquare: MockIcon,
    FolderOpen: MockIcon,
    Calculator: MockIcon,
    Receipt: MockIcon,
  }
})

describe('HubSidebarClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseValidationBadge.mockReturnValue({ pendingCount: 0, isLoading: false })
  })

  it('renders hardcoded nav labels', () => {
    render(<HubSidebarClient operatorId="op-1" userId="u-1" />)
    expect(screen.getByText('Accueil')).toBeInTheDocument()
    expect(screen.getByText('Validation Hub')).toBeInTheDocument()
    expect(screen.getByText('Clients')).toBeInTheDocument()
  })

  it('renders all expected nav links', () => {
    render(<HubSidebarClient operatorId="op-1" userId="u-1" />)
    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('/')
    expect(hrefs).toContain('/modules/crm')
    expect(hrefs).toContain('/modules/validation-hub')
    expect(hrefs).toContain('/modules/facturation')
  })

  it('shows badge when pendingCount > 0 for validation-hub (AC4)', () => {
    mockUseValidationBadge.mockReturnValue({ pendingCount: 5, isLoading: false })
    render(<HubSidebarClient operatorId="op-1" userId="u-1" />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('does NOT show badge when pendingCount is 0', () => {
    render(<HubSidebarClient operatorId="op-1" userId="u-1" />)
    // No badge number should appear
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('does NOT show badge on non-validation-hub modules', () => {
    mockUseValidationBadge.mockReturnValue({ pendingCount: 3, isLoading: false })
    render(<HubSidebarClient operatorId="op-1" userId="u-1" />)
    // Only one badge (on validation-hub), not on CRM
    const badges = screen.getAllByText('3')
    expect(badges).toHaveLength(1)
  })

  it('passes operatorId to useValidationBadge', () => {
    render(<HubSidebarClient operatorId="op-xyz" userId="u-1" />)
    expect(mockUseValidationBadge).toHaveBeenCalledWith('op-xyz')
  })

  it('renders links with correct href', () => {
    render(<HubSidebarClient operatorId="op-1" userId="u-1" />)
    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('/modules/validation-hub')
    expect(hrefs).toContain('/modules/crm')
  })

  // Story 13.1 — Renommage "Factures" → "Comptabilité"
  it('renders "Comptabilité" nav item linking to /modules/facturation (Story 13.1)', () => {
    render(<HubSidebarClient operatorId="op-1" userId="u-1" />)
    const link = screen.getByRole('link', { name: /Comptabilité/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/modules/facturation')
  })

  it('does NOT render "Factures" nav label (Story 13.1)', () => {
    render(<HubSidebarClient operatorId="op-1" userId="u-1" />)
    expect(screen.queryByText('Factures')).not.toBeInTheDocument()
  })
})
