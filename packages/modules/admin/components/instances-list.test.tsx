import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InstancesList } from './instances-list'
import * as useInstancesModule from '../hooks/use-instances'
import type { ClientInstance } from '../hooks/use-instances'

vi.mock('../hooks/use-instances')

const mockInstances: ClientInstance[] = [
  {
    id: 'inst-1',
    clientId: 'client-uuid-1',
    clientName: 'Acme Corp',
    slug: 'acme-corp',
    instanceUrl: 'https://acme-corp.foxeo.io',
    status: 'active',
    tier: 'essentiel',
    activeModules: ['core-dashboard', 'elio'],
    supabaseProjectId: 'sb-1',
    vercelProjectId: 'vcl-1',
    createdAt: '2026-03-01T10:00:00Z',
    activatedAt: '2026-03-01T10:05:00Z',
  },
  {
    id: 'inst-2',
    clientId: 'client-uuid-2',
    clientName: 'Beta SAS',
    slug: 'beta-sas',
    instanceUrl: 'https://beta-sas.foxeo.io',
    status: 'provisioning',
    tier: 'base',
    activeModules: ['core-dashboard'],
    supabaseProjectId: null,
    vercelProjectId: null,
    createdAt: '2026-03-02T10:00:00Z',
    activatedAt: null,
  },
  {
    id: 'inst-3',
    clientId: 'client-uuid-3',
    clientName: 'Gamma Ltd',
    slug: 'gamma-ltd',
    instanceUrl: 'https://gamma-ltd.foxeo.io',
    status: 'suspended',
    tier: 'agentique',
    activeModules: ['core-dashboard', 'elio', 'crm'],
    supabaseProjectId: 'sb-3',
    vercelProjectId: 'vcl-3',
    createdAt: '2026-02-15T10:00:00Z',
    activatedAt: '2026-02-15T10:10:00Z',
  },
]

describe('InstancesList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders table with all instances', () => {
    vi.mocked(useInstancesModule.useInstances).mockReturnValue({
      data: mockInstances,
      isPending: false,
      isError: false,
    } as ReturnType<typeof useInstancesModule.useInstances>)

    render(<InstancesList />)
    expect(screen.getByText('Acme Corp')).toBeTruthy()
    expect(screen.getByText('Beta SAS')).toBeTruthy()
    expect(screen.getByText('Gamma Ltd')).toBeTruthy()
  })

  it('renders correct badge labels per status', () => {
    vi.mocked(useInstancesModule.useInstances).mockReturnValue({
      data: mockInstances,
      isPending: false,
      isError: false,
    } as ReturnType<typeof useInstancesModule.useInstances>)

    render(<InstancesList />)
    expect(screen.getByText('Actif')).toBeTruthy()
    expect(screen.getByText('Provisioning...')).toBeTruthy()
    expect(screen.getByText('Suspendu')).toBeTruthy()
  })

  it('renders slug as a link pointing to instance URL', () => {
    vi.mocked(useInstancesModule.useInstances).mockReturnValue({
      data: [mockInstances[0]],
      isPending: false,
      isError: false,
    } as ReturnType<typeof useInstancesModule.useInstances>)

    render(<InstancesList />)
    const link = screen.getByRole('link', { name: /acme-corp/ }) as HTMLAnchorElement
    expect(link.href).toBe('https://acme-corp.foxeo.io/')
    expect(link.target).toBe('_blank')
  })

  it('calls onSuspend when Suspendre button clicked and confirmed', () => {
    const onSuspend = vi.fn()
    vi.mocked(useInstancesModule.useInstances).mockReturnValue({
      data: [mockInstances[0]],
      isPending: false,
      isError: false,
    } as ReturnType<typeof useInstancesModule.useInstances>)

    render(<InstancesList onSuspend={onSuspend} />)
    // Click Suspendre
    fireEvent.click(screen.getByLabelText('Suspendre acme-corp'))
    // Confirm dialog appears
    expect(screen.getByRole('dialog')).toBeTruthy()
    // Click Confirmer
    fireEvent.click(screen.getByText('Confirmer'))
    expect(onSuspend).toHaveBeenCalledWith('inst-1')
  })
})
