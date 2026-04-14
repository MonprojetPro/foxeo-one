import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ClientDetail, ParcoursDetail } from '../types/validation.types'

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    <a href={href}>{children}</a>,
}))

vi.mock('@monprojetpro/utils', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getInitials: (name: string) => name.slice(0, 2).toUpperCase(),
  }
})

const mockClient: ClientDetail = {
  id: 'c-1',
  name: 'Jean Dupont',
  company: 'Acme Corp',
  clientType: 'complet',
  avatarUrl: null,
}

describe('ClientInfoCard', () => {
  async function importComponent() {
    const { ClientInfoCard } = await import('./client-info-card')
    return ClientInfoCard
  }

  it('should render client name', async () => {
    const ClientInfoCard = await importComponent()
    render(<ClientInfoCard client={mockClient} />)
    expect(screen.getByText('Jean Dupont')).toBeDefined()
  })

  it('should render client company', async () => {
    const ClientInfoCard = await importComponent()
    render(<ClientInfoCard client={mockClient} />)
    expect(screen.getByText('Acme Corp')).toBeDefined()
  })

  it('should render client type badge', async () => {
    const ClientInfoCard = await importComponent()
    render(<ClientInfoCard client={mockClient} />)
    expect(screen.getByText('Complet')).toBeDefined()
  })

  it('should render CRM link', async () => {
    const ClientInfoCard = await importComponent()
    render(<ClientInfoCard client={mockClient} />)
    const link = screen.getByRole('link', { name: /fiche client/i })
    expect(link.getAttribute('href')).toBe('/modules/crm/clients/c-1')
  })

  it('should not render company if not provided', async () => {
    const ClientInfoCard = await importComponent()
    const clientNoCompany = { ...mockClient, company: null }
    render(<ClientInfoCard client={clientNoCompany} />)
    expect(screen.queryByText('Acme Corp')).toBeNull()
  })

  it('should render parcours info when provided', async () => {
    const ClientInfoCard = await importComponent()
    const parcours: ParcoursDetail = {
      id: 'p-1',
      name: 'Parcours Complet',
      currentStepNumber: 2,
      currentStepTitle: 'Positionnement',
      totalSteps: 5,
      completedSteps: 1,
    }
    render(<ClientInfoCard client={mockClient} parcours={parcours} />)
    expect(screen.getByText('Parcours Complet')).toBeDefined()
    expect(screen.getByText(/Positionnement/)).toBeDefined()
    expect(screen.getByRole('progressbar')).toBeDefined()
  })

  it('should not render parcours section without parcours prop', async () => {
    const ClientInfoCard = await importComponent()
    render(<ClientInfoCard client={mockClient} />)
    expect(screen.queryByRole('progressbar')).toBeNull()
  })
})
