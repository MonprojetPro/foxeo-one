import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { EffectiveElioConfig } from '../types/parcours.types'

const mockGetUser = vi.fn()
const mockStepMaybeSingle = vi.fn()
const mockGlobalMaybeSingle = vi.fn()

const mockStepEq = vi.fn(() => ({ maybeSingle: mockStepMaybeSingle }))
const mockStepSelect = vi.fn(() => ({ eq: mockStepEq }))

const mockGlobalEq = vi.fn(() => ({ maybeSingle: mockGlobalMaybeSingle }))
const mockGlobalSelect = vi.fn(() => ({ eq: mockGlobalEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'elio_step_configs') return { select: mockStepSelect }
  if (table === 'elio_configs') return { select: mockGlobalSelect }
  return { select: vi.fn() }
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const STEP_ID = '00000000-0000-0000-0000-000000000001'
const CLIENT_ID = '00000000-0000-0000-0000-000000000002'

const mockStepConfigDB = {
  id: '00000000-0000-0000-0000-000000000010',
  step_id: STEP_ID,
  persona_name: 'Élio Branding',
  persona_description: 'Expert en identité visuelle',
  system_prompt_override: 'Tu es un expert en branding.',
  model: 'claude-opus-4-6',
  temperature: 0.5,
  max_tokens: 3000,
  custom_instructions: 'Focus branding',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const mockGlobalConfigDB = {
  model: 'claude-sonnet-4-6',
  temperature: 1.0,
  max_tokens: 1500,
  custom_instructions: 'Instructions globales',
}

describe('getEffectiveElioConfig Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockStepMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockGlobalMaybeSingle.mockResolvedValue({ data: mockGlobalConfigDB, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { getEffectiveElioConfig } = await import('./get-effective-elio-config')
    const result: ActionResponse<EffectiveElioConfig> = await getEffectiveElioConfig({ stepId: STEP_ID, clientId: CLIENT_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns step config with source=step when step config exists', async () => {
    mockStepMaybeSingle.mockResolvedValue({ data: mockStepConfigDB, error: null })

    const { getEffectiveElioConfig } = await import('./get-effective-elio-config')
    const result = await getEffectiveElioConfig({ stepId: STEP_ID, clientId: CLIENT_ID })

    expect(result.error).toBeNull()
    expect(result.data?.source).toBe('step')
    expect(result.data?.personaName).toBe('Élio Branding')
    expect(result.data?.model).toBe('claude-opus-4-6')
    expect(result.data?.temperature).toBe(0.5)
    expect(result.data?.maxTokens).toBe(3000)
    expect(result.data?.customInstructions).toBe('Focus branding')
  })

  it('returns global config with source=global when no step config exists', async () => {
    const { getEffectiveElioConfig } = await import('./get-effective-elio-config')
    const result = await getEffectiveElioConfig({ stepId: STEP_ID, clientId: CLIENT_ID })

    expect(result.error).toBeNull()
    expect(result.data?.source).toBe('global')
    expect(result.data?.personaName).toBe('Élio')
    expect(result.data?.model).toBe('claude-sonnet-4-6')
    expect(result.data?.temperature).toBe(1.0)
    expect(result.data?.maxTokens).toBe(1500)
    expect(result.data?.customInstructions).toBe('Instructions globales')
  })

  it('returns default values with source=global when neither step nor global config exist', async () => {
    mockGlobalMaybeSingle.mockResolvedValue({ data: null, error: null })

    const { getEffectiveElioConfig } = await import('./get-effective-elio-config')
    const result = await getEffectiveElioConfig({ stepId: STEP_ID, clientId: CLIENT_ID })

    expect(result.error).toBeNull()
    expect(result.data?.source).toBe('global')
    expect(result.data?.personaName).toBe('Élio')
    expect(result.data?.model).toBe('claude-sonnet-4-6')
    expect(result.data?.temperature).toBe(1.0)
    expect(result.data?.maxTokens).toBe(2000)
  })

  it('returns DB_ERROR when step config query fails', async () => {
    mockStepMaybeSingle.mockResolvedValue({ data: null, error: { message: 'DB failure' } })

    const { getEffectiveElioConfig } = await import('./get-effective-elio-config')
    const result = await getEffectiveElioConfig({ stepId: STEP_ID, clientId: CLIENT_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('returns VALIDATION_ERROR for invalid stepId', async () => {
    const { getEffectiveElioConfig } = await import('./get-effective-elio-config')
    const result = await getEffectiveElioConfig({ stepId: 'not-a-uuid', clientId: CLIENT_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns DB_ERROR when global config query fails', async () => {
    mockGlobalMaybeSingle.mockResolvedValue({ data: null, error: { message: 'Global DB failure' } })

    const { getEffectiveElioConfig } = await import('./get-effective-elio-config')
    const result = await getEffectiveElioConfig({ stepId: STEP_ID, clientId: CLIENT_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('does not call global config query when step config is found', async () => {
    mockStepMaybeSingle.mockResolvedValue({ data: mockStepConfigDB, error: null })

    const { getEffectiveElioConfig } = await import('./get-effective-elio-config')
    await getEffectiveElioConfig({ stepId: STEP_ID, clientId: CLIENT_ID })

    expect(mockGlobalMaybeSingle).not.toHaveBeenCalled()
  })
})
