import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ExchangeEntry } from './request-exchanges'

vi.mock('@monprojetpro/utils', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    formatFullDate: (date: string) => `fmt:${date}`,
  }
})

describe('RequestExchanges', () => {
  async function importComponent() {
    const { RequestExchanges } = await import('./request-exchanges')
    return RequestExchanges
  }

  it('should render nothing when exchanges is empty', async () => {
    const RequestExchanges = await importComponent()
    const { container } = render(<RequestExchanges exchanges={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('should render exchanges section when entries exist', async () => {
    const RequestExchanges = await importComponent()
    const exchanges: ExchangeEntry[] = [
      {
        date: '2026-02-20T10:00:00Z',
        actor: 'MiKL',
        action: 'a demandé des précisions :',
        comment: 'Pouvez-vous préciser votre besoin ?',
      },
    ]
    render(<RequestExchanges exchanges={exchanges} />)
    expect(screen.getByText('Échanges')).toBeDefined()
    expect(screen.getByText('MiKL')).toBeDefined()
    expect(screen.getByText(/précisions/)).toBeDefined()
    expect(screen.getByText('Pouvez-vous préciser votre besoin ?')).toBeDefined()
  })

  it('should sort exchanges chronologically (oldest first)', async () => {
    const RequestExchanges = await importComponent()
    const exchanges: ExchangeEntry[] = [
      {
        date: '2026-02-22T10:00:00Z',
        actor: 'Client',
        action: 'a re-soumis',
      },
      {
        date: '2026-02-20T10:00:00Z',
        actor: 'MiKL',
        action: 'a demandé des précisions :',
        comment: 'Précisez',
      },
    ]
    render(<RequestExchanges exchanges={exchanges} />)

    const actors = screen.getAllByText(/MiKL|Client/)
    // First item should be MiKL (older date)
    expect(actors[0].textContent).toBe('MiKL')
    expect(actors[1].textContent).toBe('Client')
  })

  it('should display formatted dates', async () => {
    const RequestExchanges = await importComponent()
    const exchanges: ExchangeEntry[] = [
      {
        date: '2026-02-20T14:30:00Z',
        actor: 'MiKL',
        action: 'a validé',
      },
    ]
    render(<RequestExchanges exchanges={exchanges} />)
    expect(screen.getByText('fmt:2026-02-20T14:30:00Z')).toBeDefined()
  })

  it('should render resubmission exchange with client actor', async () => {
    const RequestExchanges = await importComponent()
    const exchanges: ExchangeEntry[] = [
      {
        date: '2026-02-20T10:00:00Z',
        actor: 'MiKL',
        action: 'a demandé des précisions :',
        comment: 'Quel est le budget ?',
      },
      {
        date: '2026-02-21T10:00:00Z',
        actor: 'Client',
        action: 'a re-soumis avec :',
        comment: 'Notre budget est de 5000€',
      },
    ]
    render(<RequestExchanges exchanges={exchanges} />)
    expect(screen.getByText('Client')).toBeDefined()
    expect(screen.getByText(/re-soumis/)).toBeDefined()
    expect(screen.getByText('Notre budget est de 5000€')).toBeDefined()
  })

  it('should display multiple exchanges in chronological order (oldest first)', async () => {
    const RequestExchanges = await importComponent()
    const exchanges: ExchangeEntry[] = [
      {
        date: '2026-02-23T10:00:00Z',
        actor: 'MiKL',
        action: 'a demandé des précisions :',
        comment: 'Deuxième question',
      },
      {
        date: '2026-02-21T10:00:00Z',
        actor: 'Client',
        action: 'a re-soumis avec :',
        comment: 'Première réponse',
      },
      {
        date: '2026-02-20T10:00:00Z',
        actor: 'MiKL',
        action: 'a demandé des précisions :',
        comment: 'Première question',
      },
    ]
    render(<RequestExchanges exchanges={exchanges} />)

    const actors = screen.getAllByText(/MiKL|Client/)
    expect(actors[0].textContent).toBe('MiKL')
    expect(actors[1].textContent).toBe('Client')
    expect(actors[2].textContent).toBe('MiKL')
  })
})
