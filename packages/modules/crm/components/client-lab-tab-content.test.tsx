import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// ── Mocks UI (primitives) ──────────────────────────────────────────────────────
vi.mock('@monprojetpro/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Badge: ({ children, ...props }: React.ComponentProps<'span'>) => <span {...props}>{children}</span>,
  Separator: () => <hr />,
  Button: ({ children, ...props }: React.ComponentProps<'button'>) => <button {...props}>{children}</button>,
}))

// ── Mocks enfants ───────────────────────────────────────────────────────────────
vi.mock('./access-toggles', () => ({
  AccessToggles: () => <div data-testid="access-toggles-mock" />,
}))
vi.mock('./parcours-status-badge', () => ({ ParcoursStatusBadge: () => <span>statut</span> }))
vi.mock('./assign-parcours-dialog', () => ({ AssignParcoursDialog: () => null }))
vi.mock('./graduation-dialog', () => ({ GraduationDialog: () => null }))
vi.mock('./reactivate-parcours-dialog', () => ({ ReactivateParcoursDialog: () => null }))
vi.mock('./lab-exit-kit-dialog', () => ({ LabExitKitDialog: () => null }))

// ── Mocks hooks ─────────────────────────────────────────────────────────────────
const mockUseClient = vi.fn()
const mockUseParcours = vi.fn()
const mockUsePending = vi.fn()
vi.mock('../hooks/use-client', () => ({ useClient: () => mockUseClient() }))
vi.mock('../hooks/use-client-parcours', () => ({ useClientParcours: () => mockUseParcours() }))
vi.mock('../hooks/use-client-pending-validations', () => ({ useClientPendingValidations: () => mockUsePending() }))

const baseClient = (dashboardType: string) => ({
  data: {
    id: 'c-1', name: 'Dev Test', company: 'ACME', status: 'active',
    config: { dashboardType },
  },
})

const parcoursEnCours = {
  data: {
    status: 'en_cours', startedAt: '2026-04-17T10:00:00Z', abandonmentReason: null,
    activeStages: [
      { active: true, status: 'completed' },
      { active: true, status: 'in_progress' },
    ],
  },
}

import { ClientLabTabContent } from './client-lab-tab-content'

describe('ClientLabTabContent', () => {
  it('affiche les 3 sections + l\'activation (AccessToggles surfacé)', () => {
    mockUseClient.mockReturnValue(baseClient('lab'))
    mockUseParcours.mockReturnValue(parcoursEnCours)
    mockUsePending.mockReturnValue({ data: { count: 0 } })

    render(<ClientLabTabContent clientId="c-1" />)
    expect(screen.getByText('Activation du Lab')).toBeDefined()
    expect(screen.getByText('Accompagnement')).toBeDefined()
    expect(screen.getByText('Évolution & sortie')).toBeDefined()
    expect(screen.getByTestId('access-toggles-mock')).toBeDefined()
  })

  it('en-tête : « Lab activé » + « activé manuellement » quand lab sans facture', () => {
    mockUseClient.mockReturnValue(baseClient('lab'))
    mockUseParcours.mockReturnValue(parcoursEnCours)
    mockUsePending.mockReturnValue({ data: { count: 0 } })

    render(
      <ClientLabTabContent clientId="c-1" billingStatus={{ invoiceSent: false, labPaid: false }} />
    )
    expect(screen.getByTestId('lab-activation-badge').textContent).toBe('Lab activé')
    expect(screen.getByText('Activé manuellement (sans facturation).')).toBeDefined()
  })

  it('en-tête : « Lab non activé » quand dashboardType ≠ lab', () => {
    mockUseClient.mockReturnValue(baseClient('hub'))
    mockUseParcours.mockReturnValue({ data: null })
    mockUsePending.mockReturnValue({ data: { count: 0 } })

    render(<ClientLabTabContent clientId="c-1" />)
    expect(screen.getByTestId('lab-activation-badge').textContent).toBe('Lab non activé')
  })

  it('place les slots facturation et config Élio', () => {
    mockUseClient.mockReturnValue(baseClient('lab'))
    mockUseParcours.mockReturnValue(parcoursEnCours)
    mockUsePending.mockReturnValue({ data: { count: 0 } })

    render(
      <ClientLabTabContent
        clientId="c-1"
        billingSlot={<div data-testid="billing-slot" />}
        elioConfigSlot={<div data-testid="elio-slot" />}
      />
    )
    expect(screen.getByTestId('billing-slot')).toBeDefined()
    expect(screen.getByTestId('elio-slot')).toBeDefined()
  })
})
