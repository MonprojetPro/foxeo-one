import { describe, it, expect, vi } from 'vitest'

function makeSupabaseMock(overrides: {
  isOperator?: boolean
  updateError?: { message: string } | null
  updatedRow?: { id: string } | null
} = {}) {
  const { isOperator = true, updateError = null, updatedRow = { id: 'rem-uuid' } } = overrides

  // Chain: .update().eq().eq().select('id').single()
  const singleMock = vi.fn(async () => ({ data: updatedRow, error: updateError }))
  const selectAfterEqMock = vi.fn(() => ({ single: singleMock }))
  const innerEqMock = vi.fn(() => ({ select: selectAfterEqMock }))
  const outerEqMock = vi.fn(() => ({ eq: innerEqMock }))
  const updateMock = vi.fn(() => ({ eq: outerEqMock }))

  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'op-auth-id' } }, error: null })),
    },
    rpc: vi.fn(async () => ({ data: isOperator, error: null })),
    from: vi.fn((table: string) => {
      if (table === 'collection_reminders') return { update: updateMock }
      return {}
    }),
    _updateMock: updateMock,
  }
}

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

describe('cancelReminder', () => {
  it('retourne VALIDATION_ERROR si reminderId vide', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabaseMock() as never)

    const { cancelReminder } = await import('./cancel-reminder')
    const result = await cancelReminder('')
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('annule la relance en mettant status=cancelled', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    const mock = makeSupabaseMock()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock as never)

    const { cancelReminder } = await import('./cancel-reminder')
    const result = await cancelReminder('rem-uuid-1')

    expect(result.error).toBeNull()
    expect(result.data?.cancelled).toBe(true)
    expect(mock._updateMock).toHaveBeenCalledWith({ status: 'cancelled' })
  })

  it('retourne FORBIDDEN si pas opérateur', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(makeSupabaseMock({ isOperator: false }) as never)

    const { cancelReminder } = await import('./cancel-reminder')
    const result = await cancelReminder('rem-uuid-1')

    expect(result.error?.code).toBe('FORBIDDEN')
  })

  it('retourne DB_ERROR si update échoue', async () => {
    const { createServerSupabaseClient } = await import('@monprojetpro/supabase')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSupabaseMock({ updateError: { message: 'DB fail' } }) as never
    )

    const { cancelReminder } = await import('./cancel-reminder')
    const result = await cancelReminder('rem-uuid-fail')

    expect(result.error?.code).toBe('DB_ERROR')
  })
})
