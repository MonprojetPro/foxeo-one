import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CrmSubNav } from './crm-sub-nav'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/modules/crm/stats'),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

// Mock @monprojetpro/utils
vi.mock('@monprojetpro/utils', () => ({
  cn: (...args: (string | boolean | undefined)[]) => args.filter(Boolean).join(' '),
}))

describe('CrmSubNav', () => {
  it('should render all navigation items', () => {
    render(<CrmSubNav />)

    expect(screen.getByText('Clients')).toBeInTheDocument()
    expect(screen.getByText('Rappels')).toBeInTheDocument()
    expect(screen.getByText('Statistiques')).toBeInTheDocument()
  })

  it('should render correct links', () => {
    render(<CrmSubNav />)

    expect(screen.getByText('Clients').closest('a')).toHaveAttribute('href', '/modules/crm')
    expect(screen.getByText('Rappels').closest('a')).toHaveAttribute('href', '/modules/crm/reminders')
    expect(screen.getByText('Statistiques').closest('a')).toHaveAttribute('href', '/modules/crm/stats')
  })

  it('should render nav container', () => {
    render(<CrmSubNav />)
    expect(screen.getByTestId('crm-sub-nav')).toBeInTheDocument()
  })
})
