import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { ElioStepConfig } from '../types/parcours.types'

const mockGetUser = vi.fn()
const mockSingle = vi.fn()
const mockSelect = vi.fn(() => ({ single: mockSingle }))
const mockUpsert = vi.fn(() => ({ select: mockSelect }))
const mockFrom = vi.fn(() => ({ upsert: mockUpsert }))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const STEP_ID = '00000000-0000-0000-0000-000000000001'

const validInput = {
  stepId: STEP_ID,
  personaName: 'Élio Branding',
  personaDescription: 'Expert en identité visuelle',
  systemPromptOverride: 'Tu es un expert en branding.',
  model: 'claude-sonnet-4-6',
  temperature: 0.8,
  maxTokens: 2000,
  customInstructions: null,
}

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
  updated_at: '2026-04-20T00:00:00.000Z',
}

describe('upsertStepElioConfig Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockSingle.mockResolvedValue({ data: mockConfigDB, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { upsertStepElioConfig } = await import('./upsert-step-elio-config')
    const result: ActionResponse<ElioStepConfig> = await upsertStepElioConfig(validInput)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid stepId', async () => {
    const { upsertStepElioConfig } = await import('./upsert-step-elio-config')
    const result = await upsertStepElioConfig({ ...validInput, stepId: 'not-a-uuid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns VALIDATION_ERROR when temperature out of range', async () => {
    const { upsertStepElioConfig } = await import('./upsert-step-elio-config')
    const result = await upsertStepElioConfig({ ...validInput, temperature: 3 })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns VALIDATION_ERROR when model is not in allowed list', async () => {
    const { upsertStepElioConfig } = await import('./upsert-step-elio-config')
    const result = await upsertStepElioConfig({ ...validInput, model: 'gpt-4o' as never })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns VALIDATION_ERROR when maxTokens out of range', async () => {
    const { upsertStepElioConfig } = await import('./upsert-step-elio-config')
    const result = await upsertStepElioConfig({ ...validInput, maxTokens: 50 })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns mapped config on successful upsert', async () => {
    const { upsertStepElioConfig } = await import('./upsert-step-elio-config')
    const result = await upsertStepElioConfig(validInput)

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data?.stepId).toBe(STEP_ID)
    expect(result.data?.personaName).toBe('Élio Branding')
    expect(result.data?.model).toBe('claude-sonnet-4-6')
    expect(result.data?.temperature).toBe(0.8)
  })

  it('calls upsert with correct snake_case payload', async () => {
    const { upsertStepElioConfig } = await import('./upsert-step-elio-config')
    await upsertStepElioConfig(validInput)

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        step_id: STEP_ID,
        persona_name: 'Élio Branding',
        model: 'claude-sonnet-4-6',
        temperature: 0.8,
        max_tokens: 2000,
      }),
      { onConflict: 'step_id' }
    )
  })

  it('returns DB_ERROR when upsert fails', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'DB failure' } })

    const { upsertStepElioConfig } = await import('./upsert-step-elio-config')
    const result = await upsertStepElioConfig(validInput)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})
