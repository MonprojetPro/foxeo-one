import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OneTeasingCard } from './one-teasing-card'

describe('OneTeasingCard', () => {
  it('renders nothing when message is undefined', () => {
    const { container } = render(<OneTeasingCard />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when message is null', () => {
    const { container } = render(<OneTeasingCard message={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when message is empty string', () => {
    const { container } = render(<OneTeasingCard message="" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders card with message when message is provided', () => {
    render(<OneTeasingCard message="Dans One, cette fonctionnalité sera automatisée par Élio+." />)
    expect(screen.getByText('Dans One, cette fonctionnalité sera automatisée par Élio+.')).toBeDefined()
  })

  it('renders "Aperçu MonprojetPro One" heading when message is present', () => {
    render(<OneTeasingCard message="Un message de teasing." />)
    expect(screen.getByText('Aperçu MonprojetPro One')).toBeDefined()
  })

  it('renders rocket icon visually (aria label or svg)', () => {
    const { container } = render(<OneTeasingCard message="Test" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })
})
