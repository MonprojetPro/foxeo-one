/**
 * Tests du check de tier dans sendToElio (Story 8.9a — Tasks 2, 9).
 * Fichier séparé pour isoler les mocks du dashboard One avec elio_tier.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendToElio } from './send-to-elio'
import { DEFAULT_ELIO_CONFIG } from '../types/elio-config.types'

const mockInvoke = vi.fn()
const mockMaybySingle = vi.fn()

// Support chained .eq() calls: from().select().eq().eq().eq()...
const makeEqChain = (): object => ({
  eq: vi.fn(() => makeEqChain()),
  single: vi.fn(async () => ({ data: { id: 'client-1' }, error: null })),
  maybeSingle: mockMaybySingle,
  // validation_requests terminates without maybeSingle (cast as any in source)
  then: undefined,
})

vi.mock('@foxeo/supabase', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => makeEqChain()),
        or: vi.fn(() => ({
          limit: vi.fn(async () => ({ data: [], error: null })),
        })),
      })),
    })),
    functions: { invoke: mockInvoke },
  })),
}))

vi.mock('./get-elio-config', () => ({
  getElioConfig: vi.fn(async () => ({ data: DEFAULT_ELIO_CONFIG, error: null })),
}))

const CLIENT_ID = 'client-tier-test'

describe('sendToElio — Tier check (Story 8.9a — Tasks 2 + 9.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AC1 — Client One tente une action One+', () => {
    it('Task 2.3/2.4 — retourne upsell si tier=one et action module détectée (send)', async () => {
      // Tier = 'one' (défaut)
      mockMaybySingle.mockResolvedValue({
        data: {
          elio_tier: 'one',
          active_modules: ['adhesions'],
          elio_config: {},
          modules_documentation: null,
        },
        error: null,
      })

      const result = await sendToElio('one', 'Envoie un rappel de cotisation aux membres en retard', CLIENT_ID)
      expect(result.data).toBeDefined()
      expect(result.error).toBeNull()
      expect(result.data?.content).toContain('One+')
      expect(result.data?.content).toContain('MiKL')
      // Pas d'appel LLM (no token waste)
      expect(mockInvoke).not.toHaveBeenCalled()
    })

    it('Task 2.3 — retourne upsell si tier=one et action create détectée', async () => {
      mockMaybySingle.mockResolvedValue({
        data: {
          elio_tier: 'one',
          active_modules: ['agenda'],
          elio_config: {},
          modules_documentation: null,
        },
        error: null,
      })

      const result = await sendToElio('one', 'Crée un événement pour samedi prochain', CLIENT_ID)
      expect(result.data?.content).toContain('One+')
      expect(mockInvoke).not.toHaveBeenCalled()
    })
  })

  describe('AC3 — Module non actif pour One+', () => {
    it('Task 7.3/7.4 — retourne message module non actif si One+ mais module absent', async () => {
      mockMaybySingle.mockResolvedValue({
        data: {
          elio_tier: 'one_plus',
          active_modules: ['agenda', 'sms'], // pas 'adhesions'
          elio_config: {},
          modules_documentation: null,
        },
        error: null,
      })

      const result = await sendToElio('one', 'Envoie un rappel de cotisation aux membres en retard', CLIENT_ID)
      expect(result.data).toBeDefined()
      expect(result.error).toBeNull()
      expect(result.data?.content).toContain('MiKL')
      expect(mockInvoke).not.toHaveBeenCalled()
    })
  })

  describe('AC2 — One+ avec module actif → confirmation', () => {
    it('Task 2.1 — One+ avec module actif appelle le LLM et retourne requiresConfirmation', async () => {
      mockMaybySingle.mockResolvedValue({
        data: {
          elio_tier: 'one_plus',
          active_modules: ['adhesions', 'agenda'],
          elio_config: {},
          modules_documentation: null,
        },
        error: null,
      })

      mockInvoke.mockResolvedValueOnce({
        data: { content: 'Je vais envoyer un rappel à 5 membres. Vous confirmez ?' },
        error: null,
      })

      const result = await sendToElio('one', 'Envoie un rappel de cotisation aux membres en retard', CLIENT_ID)
      expect(result.error).toBeNull()
      expect(result.data).toBeDefined()
      expect(result.data?.metadata?.requiresConfirmation).toBe(true)
      expect(result.data?.metadata?.pendingAction?.module).toBe('adhesions')
      expect(result.data?.metadata?.pendingAction?.verb).toBe('send')
    })

    it('Task 4.4 — action delete → requiresDoubleConfirm=true dans pendingAction', async () => {
      mockMaybySingle.mockResolvedValue({
        data: {
          elio_tier: 'one_plus',
          active_modules: ['adhesions'],
          elio_config: {},
          modules_documentation: null,
        },
        error: null,
      })

      mockInvoke.mockResolvedValueOnce({
        data: { content: 'Je vais supprimer les membres inactifs. Cette action est irréversible.' },
        error: null,
      })

      const result = await sendToElio('one', 'Supprime les membres inactifs', CLIENT_ID)
      expect(result.data?.metadata?.pendingAction?.requiresDoubleConfirm).toBe(true)
    })
  })

  describe('AC1 — Tier par défaut si elio_tier null', () => {
    it('Task 2.1 — si elio_tier null, défaut = one (bloque les actions One+)', async () => {
      mockMaybySingle.mockResolvedValue({
        data: {
          elio_tier: null,
          active_modules: ['adhesions'],
          elio_config: {},
          modules_documentation: null,
        },
        error: null,
      })

      const result = await sendToElio('one', 'Envoie un rappel de cotisation aux membres', CLIENT_ID)
      expect(result.data?.content).toContain('One+')
      expect(mockInvoke).not.toHaveBeenCalled()
    })
  })
})

describe('sendToElio — 9.5 Module non actif (Story 8.9a)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Task 9.5 — module non activé retourne message avec MiKL', async () => {
    mockMaybySingle.mockResolvedValue({
      data: {
        elio_tier: 'one_plus',
        active_modules: [], // aucun module actif
        elio_config: {},
        modules_documentation: null,
      },
      error: null,
    })

    const result = await sendToElio('one', 'Crée un événement pour demain', CLIENT_ID)
    expect(result.error).toBeNull()
    expect(result.data?.content).toContain('MiKL')
    expect(mockInvoke).not.toHaveBeenCalled()
  })
})
