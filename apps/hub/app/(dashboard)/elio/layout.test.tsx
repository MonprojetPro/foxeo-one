import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ElioLayout from './layout'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/elio/lab'),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock('@monprojetpro/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}))

describe('ElioLayout', () => {
  it('renders the three tab links', () => {
    render(<ElioLayout><div>content</div></ElioLayout>)
    expect(screen.getByRole('link', { name: 'Élio Lab' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Élio One' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Élio Hub' })).toBeInTheDocument()
  })

  it('renders nav with aria-label (Story 14.1)', () => {
    render(<ElioLayout><div>content</div></ElioLayout>)
    expect(screen.getByRole('navigation', { name: 'Navigation Élio' })).toBeInTheDocument()
  })

  it('links have correct hrefs', () => {
    render(<ElioLayout><div>content</div></ElioLayout>)
    expect(screen.getByRole('link', { name: 'Élio Lab' })).toHaveAttribute('href', '/elio/lab')
    expect(screen.getByRole('link', { name: 'Élio One' })).toHaveAttribute('href', '/elio/one')
    expect(screen.getByRole('link', { name: 'Élio Hub' })).toHaveAttribute('href', '/elio/hub')
  })

  it('renders children slot', () => {
    render(<ElioLayout><div data-testid="child">inner</div></ElioLayout>)
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
})
