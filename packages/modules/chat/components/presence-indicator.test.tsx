import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PresenceIndicator } from './presence-indicator'

describe('PresenceIndicator', () => {
  it('renders green dot when online', () => {
    render(<PresenceIndicator status="online" />)
    const dot = screen.getByTestId('presence-dot')
    expect(dot).toBeInTheDocument()
    expect(dot.lastElementChild?.className).toContain('bg-emerald-400')
  })

  it('renders gray dot when offline', () => {
    render(<PresenceIndicator status="offline" />)
    const dot = screen.getByTestId('presence-dot')
    expect(dot).toBeInTheDocument()
    expect(dot.lastElementChild?.className).toContain('bg-white/20')
  })

  it('has correct accessible label for online state', () => {
    render(<PresenceIndicator status="online" />)
    const dot = screen.getByTestId('presence-dot')
    expect(dot).toHaveAttribute('aria-label', 'En ligne')
  })

  it('has correct accessible label for offline state', () => {
    render(<PresenceIndicator status="offline" />)
    const dot = screen.getByTestId('presence-dot')
    expect(dot).toHaveAttribute('aria-label', 'Hors ligne')
  })

  it('renders with custom className', () => {
    render(<PresenceIndicator status="online" className="custom-class" />)
    const dot = screen.getByTestId('presence-dot')
    expect(dot).toHaveClass('custom-class')
  })

  it('renders tooltip text for online', () => {
    render(<PresenceIndicator status="online" />)
    expect(screen.getByTitle('En ligne')).toBeInTheDocument()
  })

  it('renders tooltip text for offline', () => {
    render(<PresenceIndicator status="offline" />)
    expect(screen.getByTitle('Hors ligne')).toBeInTheDocument()
  })
})
