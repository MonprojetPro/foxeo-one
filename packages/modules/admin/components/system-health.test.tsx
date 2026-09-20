import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SystemHealth } from './system-health'
import type { HealthCheckData } from '../hooks/use-system-health'

vi.mock('../hooks/use-system-health')

const mockHealthData: HealthCheckData = {
  checkedAt: '2026-03-09T10:00:00Z',
  globalStatus: 'ok',
  services: {
    supabase_db: { status: 'ok', latencyMs: 45 },
    supabase_storage: { status: 'ok', latencyMs: 120 },
    supabase_auth: { status: 'ok', latencyMs: 80 },
    supabase_realtime: { status: 'ok', latencyMs: 95 },
    pennylane: { status: 'degraded', latencyMs: 1800 },
    cal_com: { status: 'ok', latencyMs: 450 },
  },
}

import * as useSystemHealthModule from '../hooks/use-system-health'

describe('SystemHealth', () => {
  const mockTriggerRefresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSystemHealthModule.useSystemHealth).mockReturnValue({
      data: mockHealthData,
      isPending: false,
      isError: false,
      triggerRefresh: mockTriggerRefresh,
      refreshing: false,
    } as ReturnType<typeof useSystemHealthModule.useSystemHealth>)
  })

  it('affiche les skeletons de chargement quand isPending', () => {
    vi.mocked(useSystemHealthModule.useSystemHealth).mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      triggerRefresh: mockTriggerRefresh,
      refreshing: false,
    } as ReturnType<typeof useSystemHealthModule.useSystemHealth>)

    render(<SystemHealth />)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('affiche le statut global "OK" avec la couleur verte', () => {
    render(<SystemHealth />)
    expect(screen.getByText(/Statut global : OK/i)).toBeTruthy()
  })

  it('affiche le statut "Dégradé" quand globalStatus est degraded', () => {
    vi.mocked(useSystemHealthModule.useSystemHealth).mockReturnValue({
      data: { ...mockHealthData, globalStatus: 'degraded' },
      isPending: false,
      isError: false,
      triggerRefresh: mockTriggerRefresh,
      refreshing: false,
    } as ReturnType<typeof useSystemHealthModule.useSystemHealth>)

    render(<SystemHealth />)
    expect(screen.getByText(/Statut global : Dégradé/i)).toBeTruthy()
  })

  it('affiche le statut "Erreur" quand globalStatus est error', () => {
    vi.mocked(useSystemHealthModule.useSystemHealth).mockReturnValue({
      data: { ...mockHealthData, globalStatus: 'error' },
      isPending: false,
      isError: false,
      triggerRefresh: mockTriggerRefresh,
      refreshing: false,
    } as ReturnType<typeof useSystemHealthModule.useSystemHealth>)

    render(<SystemHealth />)
    expect(screen.getByText(/Statut global : Erreur/i)).toBeTruthy()
  })

  it('affiche le tableau des services avec leurs labels', () => {
    render(<SystemHealth />)
    expect(screen.getByText('Supabase DB')).toBeTruthy()
    expect(screen.getByText('Pennylane API')).toBeTruthy()
    expect(screen.getByText('Cal.com')).toBeTruthy()
  })

  it('affiche "Non configuré" pour les services skippés', () => {
    vi.mocked(useSystemHealthModule.useSystemHealth).mockReturnValue({
      data: {
        ...mockHealthData,
        services: {
          ...mockHealthData.services,
          pennylane: { status: 'ok', latencyMs: 0, error: 'PENNYLANE_API_TOKEN not configured — skipped' },
        },
      },
      isPending: false,
      isError: false,
      triggerRefresh: mockTriggerRefresh,
      refreshing: false,
    } as ReturnType<typeof useSystemHealthModule.useSystemHealth>)

    render(<SystemHealth />)
    const nonConfigured = screen.getAllByText('Non configuré')
    expect(nonConfigured.length).toBeGreaterThan(0)
  })

  it('appelle triggerRefresh au clic sur le bouton Rafraîchir', () => {
    render(<SystemHealth />)
    const btn = screen.getByRole('button', { name: /Rafraîchir/i })
    fireEvent.click(btn)
    expect(mockTriggerRefresh).toHaveBeenCalledTimes(1)
  })

  it('désactive le bouton Rafraîchir pendant le rafraîchissement', () => {
    vi.mocked(useSystemHealthModule.useSystemHealth).mockReturnValue({
      data: mockHealthData,
      isPending: false,
      isError: false,
      triggerRefresh: mockTriggerRefresh,
      refreshing: true,
    } as ReturnType<typeof useSystemHealthModule.useSystemHealth>)

    render(<SystemHealth />)
    const btn = screen.getByRole('button', { name: /Rafraîchir les checks de santé/i })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
  })

  it('affiche la latence formatée pour les services actifs', () => {
    render(<SystemHealth />)
    // Pennylane à 1800ms = "1.8s"
    expect(screen.getByText('1.8s')).toBeTruthy()
  })

  it('affiche "Inconnu — jamais vérifié" quand aucune donnée (pas de faux OK)', () => {
    vi.mocked(useSystemHealthModule.useSystemHealth).mockReturnValue({
      data: null,
      isPending: false,
      isError: false,
      triggerRefresh: mockTriggerRefresh,
      refreshing: false,
    } as unknown as ReturnType<typeof useSystemHealthModule.useSystemHealth>)

    render(<SystemHealth />)
    expect(screen.getByText(/Statut global : Inconnu/i)).toBeTruthy()
    expect(screen.getByText(/Jamais vérifié/i)).toBeTruthy()
    // Surtout PAS de faux "OK"
    expect(screen.queryByText(/Statut global : OK/i)).toBeNull()
  })

  it('affiche un message d\'erreur quand la requête échoue', () => {
    vi.mocked(useSystemHealthModule.useSystemHealth).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      triggerRefresh: mockTriggerRefresh,
      refreshing: false,
    } as ReturnType<typeof useSystemHealthModule.useSystemHealth>)

    render(<SystemHealth />)
    expect(screen.getByText(/Impossible de charger les données de monitoring/i)).toBeTruthy()
  })

  // ── Péremption du relevé et échec du rafraîchissement (2026-09-20) ───────────
  // Ces trois tests verrouillent ce qui a trompé MiKL le 2026-09-20 : un relevé
  // vieux d'1 h 35 affiché comme l'état courant, parce que le bouton « Rafraîchir »
  // échouait en silence et que rien ne datait la photo.

  it('avertit quand le relevé est périmé (> 15 min) — une photo n\'est pas l\'état courant', () => {
    vi.mocked(useSystemHealthModule.useSystemHealth).mockReturnValue({
      data: { ...mockHealthData, checkedAt: new Date(Date.now() - 95 * 60 * 1000).toISOString() },
      isPending: false,
      isError: false,
      triggerRefresh: mockTriggerRefresh,
      refreshing: false,
    } as ReturnType<typeof useSystemHealthModule.useSystemHealth>)

    render(<SystemHealth />)
    expect(screen.getByText(/Relevé daté de il y a 1 h 35 min/i)).toBeTruthy()
    expect(screen.getByText(/plus l'état courant/i)).toBeTruthy()
  })

  it('n\'avertit PAS quand le relevé est frais (< 15 min)', () => {
    vi.mocked(useSystemHealthModule.useSystemHealth).mockReturnValue({
      data: { ...mockHealthData, checkedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
      isPending: false,
      isError: false,
      triggerRefresh: mockTriggerRefresh,
      refreshing: false,
    } as ReturnType<typeof useSystemHealthModule.useSystemHealth>)

    render(<SystemHealth />)
    expect(screen.queryByText(/plus l'état courant/i)).toBeNull()
  })

  it('affiche l\'échec du rafraîchissement manuel — jamais silencieux', () => {
    vi.mocked(useSystemHealthModule.useSystemHealth).mockReturnValue({
      data: mockHealthData,
      isPending: false,
      isError: false,
      triggerRefresh: mockTriggerRefresh,
      refreshing: false,
      refreshError: 'Failed to send a request to the Edge Function',
    } as ReturnType<typeof useSystemHealthModule.useSystemHealth>)

    render(<SystemHealth />)
    expect(screen.getByRole('alert').textContent).toMatch(/n'a pas été rafraîchi/i)
  })
})
