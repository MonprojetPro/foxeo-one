import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ApiPlaceholder } from './api-placeholder'

vi.mock('@monprojetpro/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@monprojetpro/ui')>()
  return { ...actual }
})

describe('ApiPlaceholder', () => {
  it('renders Phase 2 badge', () => {
    render(<ApiPlaceholder />)
    expect(screen.getByText('Phase 2')).toBeTruthy()
  })

  it('renders API Client title', () => {
    render(<ApiPlaceholder />)
    expect(screen.getByText('API Client')).toBeTruthy()
  })

  it('renders description about API keys', () => {
    render(<ApiPlaceholder />)
    const desc = screen.getByText(/clés API/)
    expect(desc).toBeTruthy()
  })

  // L'emoji a ete remplace par une icone lucide rendue en SVG.
  it('renders key icon', () => {
    const { container } = render(<ApiPlaceholder />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
