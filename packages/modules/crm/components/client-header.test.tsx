import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClientHeader } from './client-header'
import type { Client } from '../types/crm.types'

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/modules/crm/clients/client-1',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

describe('ClientHeader', () => {
  const mockClient: Client = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    operatorId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Jean Dupont',
    company: 'Acme Corp',
    email: 'jean@acme.com',
    clientType: 'complet',
    status: 'active',
    sector: 'tech',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
  }

  it('should render client name as h1', () => {
    render(<ClientHeader client={mockClient} />)

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Jean Dupont')
  })

  it('should render company name', () => {
    render(<ClientHeader client={mockClient} />)

    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('should render client type badge', () => {
    render(<ClientHeader client={mockClient} />)

    expect(screen.getByText(/complet/i)).toBeInTheDocument()
  })

  it('should render status badge', () => {
    render(<ClientHeader client={mockClient} />)

    expect(screen.getByText(/actif/i)).toBeInTheDocument()
  })

  it('should render creation date', () => {
    render(<ClientHeader client={mockClient} />)

    // Check for date presence (format might vary)
    expect(screen.getByText(/client depuis/i)).toBeInTheDocument()
  })

  it('should render edit button when onEdit prop is provided', () => {
    const mockOnEdit = vi.fn()
    render(<ClientHeader client={mockClient} onEdit={mockOnEdit} />)

    expect(screen.getByRole('button', { name: /modifier/i })).toBeInTheDocument()
  })

  it('should NOT render edit button when onEdit prop is not provided', () => {
    render(<ClientHeader client={mockClient} />)

    expect(screen.queryByRole('button', { name: /modifier/i })).not.toBeInTheDocument()
  })
})
