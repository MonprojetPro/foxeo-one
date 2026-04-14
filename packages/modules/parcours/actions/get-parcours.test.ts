import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActionResponse } from '@monprojetpro/types'
import type { ParcoursWithSteps } from '../types/parcours.types'

const mockGetUser = vi.fn()
const mockSingleParcours = vi.fn()
const mockSingleClient = vi.fn()

// Parcours query chain
const mockParcoursLimit = vi.fn(() => ({ single: mockSingleParcours }))
const mockParcoursOrder = vi.fn(() => ({ limit: mockParcoursLimit }))
const mockParcoursEq = vi.fn(() => ({ order: mockParcoursOrder }))
const mockParcoursSelect = vi.fn(() => ({ eq: mockParcoursEq }))

// Steps query chain
const mockStepsOrder = vi.fn()
const mockStepsEq = vi.fn(() => ({ order: mockStepsOrder }))
const mockStepsSelect = vi.fn(() => ({ eq: mockStepsEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'parcours') return { select: mockParcoursSelect }
  if (table === 'parcours_steps') return { select: mockStepsSelect }
  return { select: vi.fn() }
})

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const PARCOURS_ID = '00000000-0000-0000-0000-000000000002'

const mockParcoursDB = {
  id: PARCOURS_ID,
  client_id: CLIENT_ID,
  template_id: null,
  name: 'Parcours Test',
  description: 'Description test',
  status: 'in_progress',
  completed_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const mockStepsDB = [
  {
    id: '00000000-0000-0000-0000-000000000010',
    parcours_id: PARCOURS_ID,
    step_number: 1,
    title: 'Étape 1',
    description: 'Desc 1',
    brief_template: null,
    brief_content: null,
    brief_assets: null,
    one_teasing_message: null,
    status: 'completed',
    completed_at: '2026-01-15T00:00:00.000Z',
    validation_required: true,
    validation_id: '00000000-0000-0000-0000-000000000099',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-15T00:00:00.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000011',
    parcours_id: PARCOURS_ID,
    step_number: 2,
    title: 'Étape 2',
    description: 'Desc 2',
    brief_template: 'Mon idée est...',
    brief_content: '## Brief détaillé\n\nContenu ici.',
    brief_assets: [],
    one_teasing_message: 'Dans One, cela sera automatisé.',
    status: 'current',
    completed_at: null,
    validation_required: true,
    validation_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-15T00:00:00.000Z',
  },
]

describe('getParcours Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockSingleParcours.mockResolvedValue({ data: mockParcoursDB, error: null })
    mockStepsOrder.mockResolvedValue({ data: mockStepsDB, error: null })
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Not auth' } })

    const { getParcours } = await import('./get-parcours')
    const result: ActionResponse<ParcoursWithSteps> = await getParcours({ clientId: CLIENT_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns VALIDATION_ERROR for invalid clientId', async () => {
    const { getParcours } = await import('./get-parcours')
    const result = await getParcours({ clientId: 'not-a-uuid' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND when parcours does not exist', async () => {
    mockSingleParcours.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    const { getParcours } = await import('./get-parcours')
    const result = await getParcours({ clientId: CLIENT_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns parcours with steps on success', async () => {
    const { getParcours } = await import('./get-parcours')
    const result = await getParcours({ clientId: CLIENT_ID })

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data?.id).toBe(PARCOURS_ID)
    expect(result.data?.clientId).toBe(CLIENT_ID)
    expect(result.data?.name).toBe('Parcours Test')
    expect(result.data?.steps).toHaveLength(2)
  })

  it('calculates progress correctly (1/2 steps completed = 50%)', async () => {
    const { getParcours } = await import('./get-parcours')
    const result = await getParcours({ clientId: CLIENT_ID })

    expect(result.data?.completedSteps).toBe(1)
    expect(result.data?.totalSteps).toBe(2)
    expect(result.data?.progressPercent).toBe(50)
  })

  it('maps steps to camelCase', async () => {
    const { getParcours } = await import('./get-parcours')
    const result = await getParcours({ clientId: CLIENT_ID })

    const firstStep = result.data?.steps[0]
    expect(firstStep?.stepNumber).toBe(1)
    expect(firstStep?.parcoursId).toBe(PARCOURS_ID)
    expect(firstStep?.validationRequired).toBe(true)
    expect(firstStep?.briefTemplate).toBeNull()
  })

  it('returns DB_ERROR when steps query fails', async () => {
    mockStepsOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const { getParcours } = await import('./get-parcours')
    const result = await getParcours({ clientId: CLIENT_ID })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('returns 0% progress when no steps exist', async () => {
    mockStepsOrder.mockResolvedValue({ data: [], error: null })

    const { getParcours } = await import('./get-parcours')
    const result = await getParcours({ clientId: CLIENT_ID })

    expect(result.data?.totalSteps).toBe(0)
    expect(result.data?.completedSteps).toBe(0)
    expect(result.data?.progressPercent).toBe(0)
  })
})
