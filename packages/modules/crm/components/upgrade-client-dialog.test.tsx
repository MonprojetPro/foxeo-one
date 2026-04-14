import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UpgradeClientDialog } from './upgrade-client-dialog'

// Mocks
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock('../actions/upgrade-client', () => ({
  upgradeClient: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
}))

vi.mock('@monprojetpro/utils', () => ({
  getModulesForTarget: vi.fn(() => [
    {
      id: 'core-dashboard',
      name: 'Dashboard',
      description: 'Module principal',
      targets: ['hub', 'client-lab', 'client-one'],
      navigation: { icon: 'LayoutDashboard', label: 'Dashboard', position: 0 },
      routes: [],
      requiredTables: [],
      dependencies: [],
      version: '0.1.0',
    },
  ]),
}))

vi.mock('../hooks/use-parcours-templates', () => ({
  useParcoursTemplates: () => ({
    data: [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Parcours Complet',
        description: 'Parcours complet avec toutes les étapes',
        parcoursType: 'complet',
        stages: [
          { key: 'discovery', name: 'Découverte', description: 'Phase de découverte', order: 1 },
          { key: 'ideation', name: 'Idéation', description: 'Phase d\'idéation', order: 2 },
        ],
        isActive: true,
        operatorId: '550e8400-e29b-41d4-a716-446655440000',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ],
    isPending: false,
  }),
}))

// Module-level variable to track active tab (set by Tabs, read by TabsContent)
let currentTabValue = 'lab'

vi.mock('@monprojetpro/ui', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
  Tabs: ({ children, value }: { children: React.ReactNode; value?: string }) => {
    currentTabValue = value || 'lab'
    return <div>{children}</div>
  },
  TabsList: ({ children }: { children: React.ReactNode }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value, onClick }: { children: React.ReactNode; value: string; onClick?: () => void }) => (
    <button role="tab" data-value={value} onClick={onClick}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    value === currentTabValue ? <div data-tab-content={value}>{children}</div> : null
  ),
  Skeleton: () => <div data-testid="skeleton" />,
  Checkbox: ({ checked, onCheckedChange, disabled }: { checked?: boolean; onCheckedChange?: (checked: boolean) => void; disabled?: boolean }) => (
    <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange?.(e.target.checked)} disabled={disabled} />
  ),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}))

const CLIENT_ID = '550e8400-e29b-41d4-a716-446655440000'

describe('UpgradeClientDialog', () => {
  const onOpenChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when closed', () => {
    render(
      <UpgradeClientDialog
        clientId={CLIENT_ID}
        open={false}
        onOpenChange={onOpenChange}
      />
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should render dialog with Lab and One tabs when open', () => {
    render(
      <UpgradeClientDialog
        clientId={CLIENT_ID}
        open={true}
        onOpenChange={onOpenChange}
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/upgrader vers lab/i)).toBeInTheDocument()
    expect(screen.getByText(/upgrader vers one/i)).toBeInTheDocument()
  })

  it('should show Lab tab content (template selector) by default', () => {
    render(
      <UpgradeClientDialog
        clientId={CLIENT_ID}
        open={true}
        onOpenChange={onOpenChange}
        defaultMode="lab"
      />
    )

    expect(screen.getByText('Parcours Complet')).toBeInTheDocument()
  })

  it('should show One tab content (module selector)', () => {
    render(
      <UpgradeClientDialog
        clientId={CLIENT_ID}
        open={true}
        onOpenChange={onOpenChange}
        defaultMode="one"
      />
    )

    expect(screen.getByText(/modules à activer/i)).toBeInTheDocument()
  })

  it('should call onOpenChange(false) when Annuler is clicked', () => {
    render(
      <UpgradeClientDialog
        clientId={CLIENT_ID}
        open={true}
        onOpenChange={onOpenChange}
      />
    )

    const cancelBtn = screen.getByRole('button', { name: /annuler/i })
    fireEvent.click(cancelBtn)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('should show submit button', () => {
    render(
      <UpgradeClientDialog
        clientId={CLIENT_ID}
        open={true}
        onOpenChange={onOpenChange}
      />
    )

    expect(screen.getByRole('button', { name: /upgrader/i })).toBeInTheDocument()
  })

  it('should call upgradeClient on submit', async () => {
    const { upgradeClient } = await import('../actions/upgrade-client')
    const mockUpgradeClient = vi.mocked(upgradeClient)

    render(
      <UpgradeClientDialog
        clientId={CLIENT_ID}
        open={true}
        onOpenChange={onOpenChange}
        defaultMode="one"
      />
    )

    const submitBtn = screen.getByRole('button', { name: /upgrader/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockUpgradeClient).toHaveBeenCalled()
    })
  })
})
