import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { OneConstructionBanner } from './one-construction-banner'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

describe('OneConstructionBanner', () => {
  it('annonce que l’outil est en cours de construction', () => {
    render(<OneConstructionBanner />)
    expect(screen.getByText(/en cours de construction/i)).toBeInTheDocument()
  })

  it('renvoie vers le module Suivi de l’outil', () => {
    render(<OneConstructionBanner />)
    const link = screen.getByRole('link', { name: /voir l['’]avancement/i })
    expect(link).toHaveAttribute('href', '/modules/suivi-outil')
  })

  it('expose un statut accessible (role=status, aria-live)', () => {
    render(<OneConstructionBanner />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })
})
