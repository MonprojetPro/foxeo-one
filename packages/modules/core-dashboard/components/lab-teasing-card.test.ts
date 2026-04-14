import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { createElement } from 'react'
import { LabTeasingCard } from './lab-teasing-card'

vi.mock('@monprojetpro/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    createElement('div', { 'data-testid': 'card', className }, children),
  CardContent: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'card-content' }, children),
  CardHeader: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'card-header' }, children),
  CardTitle: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'card-title' }, children),
}))

describe('LabTeasingCard', () => {
  it('renders nothing when show is false', () => {
    const { container } = render(
      createElement(LabTeasingCard, { show: false, onCTAClick: vi.fn() })
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders card when show is true', () => {
    const { getByTestId } = render(
      createElement(LabTeasingCard, { show: true, onCTAClick: vi.fn() })
    )
    expect(getByTestId('card')).toBeTruthy()
  })

  it('displays correct title text', () => {
    const { container } = render(
      createElement(LabTeasingCard, { show: true, onCTAClick: vi.fn() })
    )
    expect(container.textContent).toContain('Un nouveau projet en tête ?')
  })

  it('displays description text', () => {
    const { container } = render(
      createElement(LabTeasingCard, { show: true, onCTAClick: vi.fn() })
    )
    expect(container.textContent).toContain('Relancez un parcours Lab')
  })

  it('displays CTA button text', () => {
    const { container } = render(
      createElement(LabTeasingCard, { show: true, onCTAClick: vi.fn() })
    )
    expect(container.textContent).toContain('En savoir plus')
  })

  it('calls onCTAClick when button is clicked', () => {
    const onCTAClick = vi.fn()
    const { container } = render(
      createElement(LabTeasingCard, { show: true, onCTAClick })
    )
    const button = container.querySelector('button')
    expect(button).toBeTruthy()
    fireEvent.click(button!)
    expect(onCTAClick).toHaveBeenCalledOnce()
  })
})
