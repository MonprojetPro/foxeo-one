import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { ElioStepConfig } from '../types/parcours.types'

const mockGetUser = vi.fn()
const mockMaybeSingle = vi.fn()
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const STEP_ID = '00000000-0000-0000-0000-000000000001'

const mockConfigDB = {
  id: '00000000-0000-0000-0000-000000000010',
  step_id: STEP_ID,
  persona_name: 'Élio Branding',
  persona_description: 'Expert en identité visuelle',
  system_prompt_override: 'Tu es un expert en branding.',
  model: 'claude-sonnet-4-6',
  temperature: 0.8,
  max_tokens: 2000,
  custom_instructions: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

describe('getStepElioConfig Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockMaybeSingle.mockResolvedValue({ data: mockConfigDB, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { getStepElioConfig } = await import('./get-step-elio-config')
    const result: ActionResponse<ElioStepConfig | null> = await getStepElioConfig({ stepId: STEP_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid stepId', async () => {
    const { getStepElioConfig } = await import('./get-step-elio-config')
    const result = await getStepElioConfig({ stepId: 'not-a-uuid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns null when no config exists for the step', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    const { getStepElioConfig } = await import('./get-step-elio-config')
    const result = await getStepElioConfig({ stepId: STEP_ID })

    expect(result.error).toBeNull()
    expect(result.data).toBeNull()
  })

  it('returns mapped config when found', async () => {
    const { getStepElioConfig } = await import('./get-step-elio-config')
    const result = await getStepElioConfig({ stepId: STEP_ID })

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data?.stepId).toBe(STEP_ID)
    expect(result.data?.personaName).toBe('Élio Branding')
    expect(result.data?.personaDescription).toBe('Expert en identité visuelle')
    expect(result.data?.model).toBe('claude-sonnet-4-6')
    expect(result.data?.temperature).toBe(0.8)
    expect(result.data?.maxTokens).toBe(2000)
  })

  it('returns DB_ERROR when query fails', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'DB failure' } })

    const { getStepElioConfig } = await import('./get-step-elio-config')
    const result = await getStepElioConfig({ stepId: STEP_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
