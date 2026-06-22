import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClientStatusBadge } from './client-status-badge'

describe('ClientStatusBadge', () => {
  it('should render "Actif" for active status', () => {
    render(<ClientStatusBadge status="active" />)

    expect(screen.getByText('Actif')).toBeInTheDocument()
  })

  it('should render "Suspendu" for suspended status', () => {
    render(<ClientStatusBadge status="suspended" />)

    expect(screen.getByText('Suspendu')).toBeInTheDocument()
  })

  it('should render "Archivé" for archived status', () => {
    render(<ClientStatusBadge status="archived" />)

    expect(screen.getByText('Archivé')).toBeInTheDocument()
  })

  it('should apply green classes for active status', () => {
    render(<ClientStatusBadge status="active" />)

    const badge = screen.getByText('Actif')
    expect(badge.className).toContain('bg-green-500/20')
  })

  it('should apply amber classes for suspended status', () => {
    render(<ClientStatusBadge status="suspended" />)

    const badge = screen.getByText('Suspendu')
    expect(badge.className).toContain('bg-amber-500/20')
  })

  it('should apply gray classes for archived status', () => {
    render(<ClientStatusBadge status="archived" />)

    const badge = screen.getByText('Archivé')
    expect(badge.className).toContain('bg-slate-500/20')
  })

  it('should display suspension date when suspendedAt is provided', () => {
    render(
      <ClientStatusBadge
        status="suspended"
        suspendedAt="2026-02-15T10:00:00Z"
      />
    )

    expect(screen.getByText(/depuis le/)).toBeInTheDocument()
    expect(screen.getByText(/15\/02\/2026/)).toBeInTheDocument()
  })

  it('should NOT display date when suspendedAt is null', () => {
    render(<ClientStatusBadge status="suspended" suspendedAt={null} />)

    expect(screen.queryByText(/depuis le/)).not.toBeInTheDocument()
  })

  it('should display archived date when archivedAt is provided', () => {
    render(
      <ClientStatusBadge
        status="archived"
        archivedAt="2026-01-10T08:00:00Z"
      />
    )

    expect(screen.getByText(/le 10\/01\/2026/)).toBeInTheDocument()
  })

  it('should NOT display date for active status even if suspendedAt exists', () => {
    render(
      <ClientStatusBadge
        status="active"
        suspendedAt="2026-02-15T10:00:00Z"
      />
    )

    expect(screen.queryByText(/depuis le/)).not.toBeInTheDocument()
  })

  it('should apply custom className', () => {
    render(<ClientStatusBadge status="active" className="custom-class" />)

    const badge = screen.getByText('Actif')
    expect(badge.className).toContain('custom-class')
  })
})
