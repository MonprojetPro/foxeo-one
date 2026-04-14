// Story 12.7 — Tests InstancesDashboard (6 tests)

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InstancesDashboard } from './instances-dashboard'
import type { MonitoredInstance } from '../hooks/use-instances-monitoring'

vi.mock('../hooks/use-instances-monitoring')

import * as monitoringModule from '../hooks/use-instances-monitoring'

const makeInstance = (overrides: Partial<MonitoredInstance> = {}): MonitoredInstance => ({
  id: 'inst-1',
  clientId: 'client-1',
  clientName: 'Acme Corp',
  slug: 'acme',
  instanceUrl: 'https://acme.monprojet-pro.com',
  status: 'active',
  tier: 'essentiel',
  activeModules: ['chat', 'documents'],
  alertLevel: 'none',
  usageMetrics: { dbRows: 100_000, storageUsedMb: 200, bandwidthUsedGb: 0.5, edgeFunctionCalls: 50_000 },
  lastHealthCheck: '2026-03-10T06:00:00Z',
  metricsHistory: [],
  ...overrides,
})

describe('InstancesDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(monitoringModule.useInstancesMonitoring).mockReturnValue({
      data: [makeInstance()],
      isPending: false,
      isError: false,
    } as ReturnType<typeof monitoringModule.useInstancesMonitoring>)

    vi.mocked(monitoringModule.computeInstanceStats).mockReturnValue({
      activeCount: 1,
      alertCount: 0,
      criticalCount: 0,
      warningCount: 0,
      estimatedMrr: 99,
    })
  })

  it('affiche le skeleton en état de chargement', () => {
    vi.mocked(monitoringModule.useInstancesMonitoring).mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    } as ReturnType<typeof monitoringModule.useInstancesMonitoring>)

    render(<InstancesDashboard />)
    expect(screen.getByLabelText('Chargement du tableau de bord instances')).toBeDefined()
  })

  it('affiche les statistiques globales', () => {
    render(<InstancesDashboard />)
    expect(screen.getByLabelText("Vue d'ensemble instances")).toBeDefined()
    expect(screen.getByText('1')).toBeDefined() // activeCount
    expect(screen.getByText('99€/mois')).toBeDefined() // MRR
  })

  it('affiche le badge OK pour une instance sans alerte', () => {
    render(<InstancesDashboard />)
    // getByRole badge (span avec data-slot="badge") contenant "OK"
    const badges = screen.getAllByText('OK')
    // Au moins un élément badge (span) doit exister avec le texte OK
    const badgeEl = badges.find((el) => el.closest('[data-slot="badge"]') !== null)
    expect(badgeEl).toBeDefined()
  })

  it('affiche le badge Critique pour une instance en alerte critique', () => {
    vi.mocked(monitoringModule.useInstancesMonitoring).mockReturnValue({
      data: [makeInstance({ alertLevel: 'critical' })],
      isPending: false,
      isError: false,
    } as ReturnType<typeof monitoringModule.useInstancesMonitoring>)

    render(<InstancesDashboard />)
    const badges = screen.getAllByText('Critique')
    const badgeEl = badges.find((el) => el.closest('[data-slot="badge"]') !== null)
    expect(badgeEl).toBeDefined()
  })

  it('filtre les instances par niveau d\'alerte', () => {
    vi.mocked(monitoringModule.useInstancesMonitoring).mockReturnValue({
      data: [
        makeInstance({ id: 'inst-1', slug: 'acme', alertLevel: 'none' }),
        makeInstance({ id: 'inst-2', slug: 'beta', alertLevel: 'warning' }),
      ],
      isPending: false,
      isError: false,
    } as ReturnType<typeof monitoringModule.useInstancesMonitoring>)

    render(<InstancesDashboard />)

    // Cliquer sur le filtre Warning
    const warningBtn = screen.getByRole('button', { name: /Warning/i })
    fireEvent.click(warningBtn)

    // Seule l'instance beta (warning) doit apparaître
    expect(screen.getByText('beta')).toBeDefined()
    expect(screen.queryByText('acme')).toBeNull()
  })

  it('affiche un message vide si aucune instance ne correspond au filtre', () => {
    vi.mocked(monitoringModule.useInstancesMonitoring).mockReturnValue({
      data: [makeInstance({ alertLevel: 'none' })],
      isPending: false,
      isError: false,
    } as ReturnType<typeof monitoringModule.useInstancesMonitoring>)

    render(<InstancesDashboard />)

    const criticalBtn = screen.getByRole('button', { name: /Critique/i })
    fireEvent.click(criticalBtn)

    expect(screen.getByText('Aucune instance pour ce filtre')).toBeDefined()
  })
})
