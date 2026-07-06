import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLlmConfig, setLlmConfig } from './llm-config'
import { DEFAULT_LLM_CONFIG, type LlmConfig } from '../types/llm-config.types'

const LLM_CONFIG_KEY = 'llm_config' // constante locale pour les tests

const mockUpsert = vi.fn().mockResolvedValue({ error: null })
const mockMaybeSingle = vi.fn()
const mockGetUser = vi.fn()
const mockRpc = vi.fn()

const mockSupabase = {
  from: vi.fn(() => ({
    upsert: mockUpsert,
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: mockMaybeSingle,
      })),
    })),
  })),
  auth: { getUser: mockGetUser },
  rpc: mockRpc,
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

const validConfig: LlmConfig = {
  default: {
    provider: 'openai-compatible',
    model: 'mistral-large-latest',
    baseUrl: 'https://api.mistral.ai/v1',
    apiKeyEnv: 'MISTRAL_API_KEY',
  },
  micro: {
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    baseUrl: null,
    apiKeyEnv: 'ANTHROPIC_API_KEY',
  },
  hubAgent: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    baseUrl: null,
    apiKeyEnv: 'ANTHROPIC_API_KEY',
  },
}

function authAsOperator() {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-mikl' } }, error: null })
  mockRpc.mockResolvedValue({ data: true, error: null })
}

describe('getLlmConfig', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne la config stockée si valide', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { value: validConfig }, error: null })
    const { data, error } = await getLlmConfig()
    expect(error).toBeNull()
    expect(data).toEqual(validConfig)
  })

  it('fallback défauts Anthropic si clé absente', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const { data, error } = await getLlmConfig()
    expect(error).toBeNull()
    expect(data).toEqual(DEFAULT_LLM_CONFIG)
    expect(data!.default.provider).toBe('anthropic')
    expect(data!.default.apiKeyEnv).toBe('ANTHROPIC_API_KEY')
  })

  it('fallback défauts si la valeur stockée est invalide (schéma non conforme)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { value: { default: { provider: 'foo' } } }, error: null })
    const { data, error } = await getLlmConfig()
    expect(error).toBeNull()
    expect(data).toEqual(DEFAULT_LLM_CONFIG)
  })

  it('fallback défauts si la lecture DB échoue (jamais bloquant)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'DB down' } })
    const { data, error } = await getLlmConfig()
    expect(error).toBeNull()
    expect(data).toEqual(DEFAULT_LLM_CONFIG)
  })
})

describe('setLlmConfig', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sauvegarde la config dans system_config (opérateur)', async () => {
    authAsOperator()
    mockUpsert.mockResolvedValue({ error: null })

    const { data, error } = await setLlmConfig(validConfig)
    expect(error).toBeNull()
    expect(data).toEqual(validConfig)
    expect(mockUpsert).toHaveBeenCalledWith(
      { key: LLM_CONFIG_KEY, value: validConfig },
      { onConflict: 'key' },
    )
  })

  it('retourne VALIDATION_ERROR si apiKeyEnv ne finit pas par _API_KEY', async () => {
    authAsOperator()
    const bad = {
      ...validConfig,
      default: { ...validConfig.default, apiKeyEnv: 'SUPABASE_SERVICE_ROLE_KEY' },
    }
    const { data, error } = await setLlmConfig(bad as LlmConfig)
    expect(data).toBeNull()
    expect(error!.code).toBe('VALIDATION_ERROR')
  })

  it('retourne VALIDATION_ERROR si openai-compatible sans baseUrl', async () => {
    authAsOperator()
    const bad = {
      ...validConfig,
      default: { ...validConfig.default, baseUrl: null },
    }
    const { data, error } = await setLlmConfig(bad as LlmConfig)
    expect(data).toBeNull()
    expect(error!.code).toBe('VALIDATION_ERROR')
  })

  it('retourne UNAUTHORIZED si non authentifié', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } })
    const { data, error } = await setLlmConfig(validConfig)
    expect(data).toBeNull()
    expect(error!.code).toBe('UNAUTHORIZED')
  })

  it('retourne FORBIDDEN si non opérateur', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-client' } }, error: null })
    mockRpc.mockResolvedValue({ data: false, error: null })
    const { data, error } = await setLlmConfig(validConfig)
    expect(data).toBeNull()
    expect(error!.code).toBe('FORBIDDEN')
  })

  it("retourne DATABASE_ERROR si l'upsert échoue", async () => {
    authAsOperator()
    mockUpsert.mockResolvedValue({ error: { message: 'DB error' } })
    const { data, error } = await setLlmConfig(validConfig)
    expect(data).toBeNull()
    expect(error!.code).toBe('DATABASE_ERROR')
  })
})
