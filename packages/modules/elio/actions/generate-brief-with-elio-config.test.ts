/**
 * Task 6.2 — Tests injection config Élio dans generate-brief
 * Vérifie que les paramètres Orpheus (model, temperature, max_tokens, custom_instructions)
 * sont bien injectés dans les appels à l'API Claude.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { generateBrief } from './generate-brief'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import Anthropic from '@anthropic-ai/sdk'

const mockCreate = vi.fn()

const makeSupabaseMockWithConfig = (elioConfigData: Record<string, unknown> | null) => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
  },
  from: vi.fn().mockImplementation((table: string) => {
    if (table === 'clients') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'client-1', operator_id: 'op-1' },
          error: null,
        }),
      }
    }
    if (table === 'parcours_steps') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'step-1',
            step_number: 2,
            title: 'Positionnement',
            description: 'Définir votre positionnement',
            brief_template: null,
            parcours: { client_id: 'client-1' },
          },
          error: null,
        }),
      }
    }
    if (table === 'communication_profiles') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    }
    if (table === 'elio_configs') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: elioConfigData, error: null }),
      }
    }
    // elio_conversations — table not yet available
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'table not found' } }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
  }),
})

describe('generateBrief — injection config Élio (Orpheus)', () => {
  const originalEnv = process.env.ANTHROPIC_API_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ANTHROPIC_API_KEY = 'test-key'
    ;(Anthropic as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      messages: { create: mockCreate },
    }))
  })

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalEnv
  })

  it('utilise le modèle par défaut quand aucune config Élio', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSupabaseMockWithConfig(null) as never
    )
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: '# Brief' }] })

    await generateBrief('step-1')

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        temperature: 1.0,
      })
    )
  })

  it('utilise le modèle custom si config Élio présente', async () => {
    const customConfig = {
      id: 'config-1',
      client_id: 'client-1',
      model: 'claude-haiku-4-20250122',
      temperature: 0.5,
      max_tokens: 800,
      custom_instructions: null,
      enabled_features: {},
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    }

    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSupabaseMockWithConfig(customConfig) as never
    )
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: '# Brief haiku' }] })

    await generateBrief('step-1')

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-haiku-4-20250122',
        max_tokens: 800,
        temperature: 0.5,
      })
    )
  })

  it('injecte les custom_instructions dans le prompt si définies', async () => {
    const customConfig = {
      id: 'config-1',
      client_id: 'client-1',
      model: 'claude-sonnet-4-20250514',
      temperature: 1.0,
      max_tokens: 1500,
      custom_instructions: 'Utilise toujours des analogies cinématographiques',
      enabled_features: {},
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    }

    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSupabaseMockWithConfig(customConfig) as never
    )
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: '# Brief avec instructions' }] })

    await generateBrief('step-1')

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('analogies cinématographiques'),
          }),
        ]),
      })
    )
  })

  it('fonctionne sans custom_instructions (prompt non modifié)', async () => {
    const configWithoutInstructions = {
      id: 'config-1',
      client_id: 'client-1',
      model: 'claude-sonnet-4-20250514',
      temperature: 1.0,
      max_tokens: 1500,
      custom_instructions: null,
      enabled_features: {},
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    }

    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSupabaseMockWithConfig(configWithoutInstructions) as never
    )
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: '# Brief sans instructions' }] })

    const result = await generateBrief('step-1')

    expect(result.error).toBeNull()
    expect(result.data?.brief).toBeDefined()
  })
})
