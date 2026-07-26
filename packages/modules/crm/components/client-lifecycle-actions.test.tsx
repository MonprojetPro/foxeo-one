import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClientLifecycleActions } from './client-lifecycle-actions'
import type { Client } from '../types/crm.types'

// Mock dependencies
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock('../actions/reactivate-client', () => ({
  reactivateClient: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
}))

vi.mock('./upgrade-client-dialog', () => ({
  UpgradeClientDialog: () => null,
}))

vi.mock('./cancel-subscription-dialog', () => ({
  CancelSubscriptionDialog: () => null,
}))

vi.mock('../actions/cancel-subscription', () => ({
  reactivateSubscription: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
}))

const baseClient: Client = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  operatorId: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Jean Dupont',
  company: 'Acme Corp',
  email: 'jean@acme.com',
  clientType: 'complet',
  status: 'active',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-20T14:30:00Z',
}

describe('ClientLifecycleActions', () => {
  it('should render "Suspendre" button for active client', () => {
    render(<ClientLifecycleActions client={{ ...baseClient, status: 'active' }} />)

    expect(screen.getByRole('button', { name: /suspendre/i })).toBeInTheDocument()
  })

  it('should render "Réactiver" button for suspended client', () => {
    render(<ClientLifecycleActions client={{ ...baseClient, status: 'suspended' }} />)

    expect(screen.getByRole('button', { name: /réactiver/i })).toBeInTheDocument()
  })

  it('should render "Réactiver" button for archived client', () => {
    render(<ClientLifecycleActions client={{ ...baseClient, status: 'archived' }} />)

    expect(screen.getByRole('button', { name: /réactiver/i })).toBeInTheDocument()
  })

  it('should NOT show "Réactiver" button for active client', () => {
    render(<ClientLifecycleActions client={{ ...baseClient, status: 'active' }} />)

    expect(screen.queryByRole('button', { name: /réactiver/i })).not.toBeInTheDocument()
  })

  it('should NOT show "Suspendre" button for suspended client', () => {
    render(<ClientLifecycleActions client={{ ...baseClient, status: 'suspended' }} />)

    expect(screen.queryByRole('button', { name: /suspendre/i })).not.toBeInTheDocument()
  })

  // Story 2.9c — Upgrade buttons for ponctuel clients
  it('should show upgrade buttons for ponctuel active client', () => {
    render(
      <ClientLifecycleActions
        client={{ ...baseClient, clientType: 'ponctuel', status: 'active' }}
      />
    )

    expect(screen.getByRole('button', { name: /upgrader vers lab/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upgrader vers one/i })).toBeInTheDocument()
  })

  it('should NOT show upgrade buttons for non-ponctuel client', () => {
    render(
      <ClientLifecycleActions
        client={{ ...baseClient, clientType: 'complet', status: 'active' }}
      />
    )

    expect(screen.queryByRole('button', { name: /upgrader vers lab/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /upgrader vers one/i })).not.toBeInTheDocument()
  })

  it('should NOT show upgrade buttons for ponctuel suspended client', () => {
    render(
      <ClientLifecycleActions
        client={{ ...baseClient, clientType: 'ponctuel', status: 'suspended' }}
      />
    )

    expect(screen.queryByRole('button', { name: /upgrader vers lab/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /upgrader vers one/i })).not.toBeInTheDocument()
  })
})
