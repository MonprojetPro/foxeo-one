import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { submitElioBrief } from './submit-elio-brief'
import { createServerSupabaseClient } from '@monprojetpro/supabase'

const makeInsertChain = (returnValue: unknown) => ({
  insert: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue(returnValue),
    }),
  }),
})

const makeFromMock = (overrides: Partial<Record<string, unknown>> = {}) =>
  vi.fn().mockImplementation((table: string) => {
    if (table === 'clients') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'client-1', operator_id: 'op-1', name: 'Test Client' },
          error: null,
        }),
      }
    }
    if (table === 'parcours_steps') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'step-1', step_number: 2, title: 'Positionnement' },
          error: null,
        }),
      }
    }
    if (table === 'step_submissions') {
      if (overrides['step_submissions_pending']) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'existing-sub', status: 'pending' },
            error: null,
          }),
          insert: vi.fn().mockReturnThis(),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        ...makeInsertChain({ data: { id: 'sub-123' }, error: null }),
      }
    }
    if (table === 'notifications') {
      return {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
    }
  })

const makeSupabaseMock = (overrides: Partial<Record<string, unknown>> = {}) => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
  },
  from: makeFromMock(overrides),
})

describe('submitElioBrief', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('crée une soumission avec succès', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabaseMock() as never)

    const result = await submitElioBrief({ stepId: 'step-1', content: '# Brief généré\n\nContenu...' })

    expect(result.error).toBeNull()
    expect(result.data?.submissionId).toBe('sub-123')
  })

  it('retourne UNAUTHORIZED si non connecté', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never)

    const result = await submitElioBrief({ stepId: 'step-1', content: 'content' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('retourne VALIDATION_ERROR si content vide', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabaseMock() as never)

    const result = await submitElioBrief({ stepId: 'step-1', content: '   ' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne VALIDATION_ERROR si stepId vide', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabaseMock() as never)

    const result = await submitElioBrief({ stepId: '', content: 'contenu' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('retourne NOT_FOUND si client non trouvé', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        in: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
      })),
    } as never)

    const result = await submitElioBrief({ stepId: 'step-1', content: 'contenu' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('retourne DUPLICATE_SUBMISSION si soumission pending existe', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSupabaseMock({ step_submissions_pending: true }) as never
    )

    const result = await submitElioBrief({ stepId: 'step-1', content: 'contenu' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DUPLICATE_SUBMISSION')
  })

  it('envoie les notifications après soumission', async () => {
    const supabaseMock = makeSupabaseMock()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabaseMock as never)

    await submitElioBrief({ stepId: 'step-1', content: '# Brief' })

    // Vérifier que notifications a été appelé
    const notificationsCalls = supabaseMock.from.mock.calls.filter(
      ([table]: [string]) => table === 'notifications'
    )
    expect(notificationsCalls.length).toBeGreaterThan(0)
  })

  it('retourne DATABASE_ERROR si création soumission échoue', async () => {
    const supabaseMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'clients') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'client-1', operator_id: 'op-1', name: 'Test' },
              error: null,
            }),
          }
        }
        if (table === 'parcours_steps') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'step-1', step_number: 1, title: 'Etape' },
              error: null,
            }),
            update: vi.fn().mockReturnThis(),
          }
        }
        if (table === 'step_submissions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
              }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
    }
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabaseMock as never)

    const result = await submitElioBrief({ stepId: 'step-1', content: 'contenu' })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })
})
