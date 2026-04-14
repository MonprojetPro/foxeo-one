import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/cache (hoisted-safe)
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// ── Supabase mock (top-level chain fns, referenced in factory) ─────────────
const mockGetUser = vi.fn()

// operators table
const mockOperatorSingle = vi.fn()
const mockOperatorEq = vi.fn(() => ({ single: mockOperatorSingle }))
const mockOperatorSelect = vi.fn(() => ({ eq: mockOperatorEq }))

// clients table
const mockClientSingle = vi.fn()
const mockClientEqTwo = vi.fn(() => ({ single: mockClientSingle }))
const mockClientEqOne = vi.fn(() => ({ eq: mockClientEqTwo }))
const mockClientSelect = vi.fn(() => ({ eq: mockClientEqOne }))

// clients update
const mockClientUpdateEq = vi.fn().mockResolvedValue({ error: null })
const mockClientUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ eq: mockClientUpdateEq })) }))

// parcours duplicate check: select → eq → eq → limit → maybeSingle
const mockParcoursMaybeSingle = vi.fn()
const mockParcoursLimit = vi.fn(() => ({ maybeSingle: mockParcoursMaybeSingle }))
const mockParcoursCheckEqTwo = vi.fn(() => ({ limit: mockParcoursLimit }))
const mockParcoursCheckEqOne = vi.fn(() => ({ eq: mockParcoursCheckEqTwo }))
const mockParcoursCheckSelect = vi.fn(() => ({ eq: mockParcoursCheckEqOne }))

// parcours insert → select → single
const mockParcoursInsertSingle = vi.fn()
const mockParcoursInsertSelect = vi.fn(() => ({ single: mockParcoursInsertSingle }))
const mockParcoursInsert = vi.fn(() => ({ select: mockParcoursInsertSelect }))

// parcours_templates table
const mockTemplateSingle = vi.fn()
const mockTemplateEq = vi.fn(() => ({ single: mockTemplateSingle }))
const mockTemplateSelect = vi.fn(() => ({ eq: mockTemplateEq }))

// client_configs update
const mockConfigUpdateEq = vi.fn().mockResolvedValue({ error: null })
const mockConfigUpdate = vi.fn(() => ({ eq: mockConfigUpdateEq }))

// activity_logs insert
const mockLogInsert = vi.fn().mockResolvedValue({ error: null })

const mockFrom = vi.fn((table: string) => {
  if (table === 'operators') return { select: mockOperatorSelect }
  if (table === 'clients') return { select: mockClientSelect, update: mockClientUpdate }
  if (table === 'parcours') return { select: mockParcoursCheckSelect, insert: mockParcoursInsert }
  if (table === 'parcours_templates') return { select: mockTemplateSelect }
  if (table === 'client_configs') return { update: mockConfigUpdate }
  if (table === 'activity_logs') return { insert: mockLogInsert }
  return {}
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}))

vi.mock('@monprojetpro/types', () => ({
  successResponse: (data: unknown) => ({ data, error: null }),
  errorResponse: (message: string, code: string, details?: unknown) => ({
    data: null,
    error: { message, code, details },
  }),
}))

// ── Test data ──────────────────────────────────────────────────────────────
const OPERATOR_ID = '550e8400-e29b-41d4-a716-446655440000'
const CLIENT_ID = '550e8400-e29b-41d4-a716-446655440001'
const TEMPLATE_ID = '550e8400-e29b-41d4-a716-446655440002'
const PARCOURS_ID = '550e8400-e29b-41d4-a716-446655440003'

import { upgradeClient } from './upgrade-client'

describe('upgradeClient Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: authenticated
    mockGetUser.mockResolvedValue({
      data: { user: { id: OPERATOR_ID } },
      error: null,
    })

    // Default: operator found
    mockOperatorSingle.mockResolvedValue({ data: { id: OPERATOR_ID }, error: null })

    // Default: ponctuel active client found (ADR-01 Rev 2: eligible = one + !lab_mode_available)
    mockClientSingle.mockResolvedValue({
      data: {
        id: CLIENT_ID,
        client_type: 'ponctuel',
        status: 'active',
        operator_id: OPERATOR_ID,
        client_configs: { dashboard_type: 'one', lab_mode_available: false },
      },
      error: null,
    })

    // Default: no existing parcours (duplicate check)
    mockParcoursMaybeSingle.mockResolvedValue({ data: null })

    // Default: template found
    mockTemplateSingle.mockResolvedValue({ data: { name: 'Parcours Complet' }, error: null })

    // Default: parcours insert success
    mockParcoursInsertSingle.mockResolvedValue({
      data: { id: PARCOURS_ID },
      error: null,
    })

    // Default: update/insert success
    mockClientUpdateEq.mockResolvedValue({ error: null })
    mockConfigUpdateEq.mockResolvedValue({ error: null })
    mockLogInsert.mockResolvedValue({ error: null })
  })

  // ── Auth ─────────────────────────────────────────────────────────────────
  it('should return UNAUTHORIZED if user not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('not auth') })

    const result = await upgradeClient({
      clientId: CLIENT_ID,
      targetType: 'complet',
      parcoursConfig: { templateId: TEMPLATE_ID, activeStages: [] },
    })

    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  // ── Validation ────────────────────────────────────────────────────────────
  it('should return VALIDATION_ERROR for invalid clientId', async () => {
    const result = await upgradeClient({
      clientId: 'not-a-uuid',
      targetType: 'complet',
    })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return VALIDATION_ERROR for invalid targetType', async () => {
    const result = await upgradeClient({
      clientId: CLIENT_ID,
      targetType: 'invalid' as 'complet',
    })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return NOT_FOUND if operator not found', async () => {
    mockOperatorSingle.mockResolvedValue({ data: null, error: new Error('not found') })

    const result = await upgradeClient({
      clientId: CLIENT_ID,
      targetType: 'complet',
      parcoursConfig: { templateId: TEMPLATE_ID, activeStages: [] },
    })

    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return NOT_FOUND if client not found', async () => {
    mockClientSingle.mockResolvedValue({ data: null, error: new Error('not found') })

    const result = await upgradeClient({
      clientId: CLIENT_ID,
      targetType: 'complet',
      parcoursConfig: { templateId: TEMPLATE_ID, activeStages: [] },
    })

    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('should return VALIDATION_ERROR if client is not ponctuel (lab_mode_available=true)', async () => {
    mockClientSingle.mockResolvedValue({
      data: {
        id: CLIENT_ID,
        client_type: 'complet',
        status: 'active',
        operator_id: OPERATOR_ID,
        client_configs: { dashboard_type: 'lab', lab_mode_available: true },
      },
      error: null,
    })

    const result = await upgradeClient({
      clientId: CLIENT_ID,
      targetType: 'complet',
      parcoursConfig: { templateId: TEMPLATE_ID, activeStages: [] },
    })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toMatch(/ponctuel/i)
  })

  it('should return VALIDATION_ERROR if client is not active', async () => {
    mockClientSingle.mockResolvedValue({
      data: {
        id: CLIENT_ID,
        client_type: 'ponctuel',
        status: 'suspended',
        operator_id: OPERATOR_ID,
        client_configs: { dashboard_type: 'one', lab_mode_available: false },
      },
      error: null,
    })

    const result = await upgradeClient({
      clientId: CLIENT_ID,
      targetType: 'complet',
      parcoursConfig: { templateId: TEMPLATE_ID, activeStages: [] },
    })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.error?.message).toMatch(/actif/i)
  })

  // ── Lab upgrade (complet) ──────────────────────────────────────────────────
  it('should successfully upgrade to Lab (complet)', async () => {
    const result = await upgradeClient({
      clientId: CLIENT_ID,
      targetType: 'complet',
      parcoursConfig: {
        templateId: TEMPLATE_ID,
        activeStages: [{ key: 'discovery', active: true }],
      },
    })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ success: true })
  })

  it('should return VALIDATION_ERROR if Lab upgrade has no parcoursConfig', async () => {
    const result = await upgradeClient({
      clientId: CLIENT_ID,
      targetType: 'complet',
      // No parcoursConfig
    })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return VALIDATION_ERROR if Lab upgrade has no templateId', async () => {
    const result = await upgradeClient({
      clientId: CLIENT_ID,
      targetType: 'complet',
      parcoursConfig: {
        templateId: '',
        activeStages: [],
      } as unknown as { templateId: string; activeStages: { key: string; active: boolean }[] },
    })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('should return DUPLICATE_PARCOURS if client already has active parcours', async () => {
    mockParcoursMaybeSingle.mockResolvedValue({ data: { id: PARCOURS_ID } })

    const result = await upgradeClient({
      clientId: CLIENT_ID,
      targetType: 'complet',
      parcoursConfig: { templateId: TEMPLATE_ID, activeStages: [] },
    })

    expect(result.error?.code).toBe('DUPLICATE_PARCOURS')
  })

  it('should return NOT_FOUND if template does not exist', async () => {
    mockTemplateSingle.mockResolvedValue({ data: null, error: new Error('not found') })

    const result = await upgradeClient({
      clientId: CLIENT_ID,
      targetType: 'complet',
      parcoursConfig: { templateId: TEMPLATE_ID, activeStages: [] },
    })

    expect(result.error?.code).toBe('NOT_FOUND')
    expect(result.error?.message).toMatch(/template/i)
  })

  it('should log activity after Lab upgrade', async () => {
    await upgradeClient({
      clientId: CLIENT_ID,
      targetType: 'complet',
      parcoursConfig: { templateId: TEMPLATE_ID, activeStages: [] },
    })

    expect(mockLogInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'client_upgraded',
        entity_type: 'client',
        entity_id: CLIENT_ID,
      })
    )
  })

  // ── One upgrade (direct_one) ───────────────────────────────────────────────
  it('should successfully upgrade to One (direct_one)', async () => {
    const result = await upgradeClient({
      clientId: CLIENT_ID,
      targetType: 'direct_one',
      modules: ['core-dashboard'],
    })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ success: true })
  })

  it('should default to core-dashboard if no modules provided for One', async () => {
    const result = await upgradeClient({
      clientId: CLIENT_ID,
      targetType: 'direct_one',
    })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ success: true })
    expect(mockConfigUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        active_modules: ['core-dashboard'],
      })
    )
  })

  it('should log activity after One upgrade', async () => {
    await upgradeClient({
      clientId: CLIENT_ID,
      targetType: 'direct_one',
      modules: ['core-dashboard'],
    })

    expect(mockLogInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'client_upgraded',
        entity_type: 'client',
        entity_id: CLIENT_ID,
      })
    )
  })
})
