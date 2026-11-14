import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SystemHealthAlert } from './system-health-alert'
import * as useSystemHealthModule from '../hooks/use-system-health'
import type { HealthCheckData } from '../hooks/use-system-health'

vi.mock('../hooks/use-system-health')

// Realtime : channel factice (on/subscribe/removeChannel no-op)
vi.mock('@monprojetpro/supabase', () => ({
  createBrowserSupabaseClient: () => ({
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: vi.fn(),
  }),
}))
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })) }
})

function mockHealth(data: HealthCheckData | null) {
  vi.mocked(useSystemHealthModule.useSystemHealth).mockReturnValue({
    data,
    isPending: false,
    isError: false,
  } as ReturnType<typeof useSystemHealthModule.useSystemHealth>)
}

const okData: HealthCheckData = {
  checkedAt: '2026-07-02T10:00:00Z',
  globalStatus: 'ok',
  services: { supabase_db: { status: 'ok', latencyMs: 100 } },
}

describe('SystemHealthAlert', () => {
  beforeEach(() => vi.clearAllMocks())

  it('n\'affiche rien quand tout est OK', () => {
    mockHealth(okData)
    const { container } = render(<SystemHealthAlert />)
    expect(container).toBeEmptyDOMElement()
  })

  it('n\'affiche rien sans données', () => {
    mockHealth(null)
    const { container } = render(<SystemHealthAlert />)
    expect(container).toBeEmptyDOMElement()
  })

  it('affiche une alerte "panne" (rouge) avec le service en erreur et un lien vers le monitoring', () => {
    mockHealth({
      checkedAt: '2026-07-02T10:00:00Z',
      globalStatus: 'error',
      services: {
        supabase_db: { status: 'ok', latencyMs: 100 },
        vercel_client: { status: 'error', latencyMs: 9000 },
      },
    })
    render(<SystemHealthAlert />)
    expect(screen.getByText(/service en panne/i)).toBeTruthy()
    expect(screen.getByText('App Client (Vercel)')).toBeTruthy()
    const link = screen.getByRole('link', { name: /monitoring/i })
    expect(link).toHaveAttribute('href', '/modules/admin/system')
  })

  // T-091 (2026-11-14) : une lenteur n'est pas une panne — plus de bandeau sur l'accueil.
  it("n'affiche rien quand un service est seulement lent (degraded)", () => {
    mockHealth({
      checkedAt: '2026-11-14T06:30:00Z',
      globalStatus: 'degraded',
      services: {
        supabase_db: { status: 'degraded', latencyMs: 2991 },
      },
    })
    const { container } = render(<SystemHealthAlert />)
    expect(container.innerHTML).toBe('')
  })

  it("en cas de panne, ne liste que les services en panne, pas les lents", () => {
    mockHealth({
      checkedAt: '2026-11-14T06:30:00Z',
      globalStatus: 'error',
      services: {
        supabase_db: { status: 'degraded', latencyMs: 2991 },
        resend: { status: 'error', latencyMs: 8000 },
      },
    })
    render(<SystemHealthAlert />)
    expect(screen.getByText('Resend (emails)')).toBeTruthy()
    expect(screen.queryByText('Supabase DB')).toBeNull()
  })
})
