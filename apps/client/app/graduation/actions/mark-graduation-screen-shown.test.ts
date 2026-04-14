import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@monprojetpro/types', () => ({
  successResponse: vi.fn((data) => ({ data, error: null })),
  errorResponse: vi.fn((message, code, details?) => ({
    data: null,
    error: { message, code, details },
  })),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { markGraduationScreenShown } from './mark-graduation-screen-shown'

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

describe('markGraduationScreenShown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as any)
  })

  it('returns UNAUTHORIZED when user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated'),
    })

    const result = await markGraduationScreenShown()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns UNAUTHORIZED when auth returns error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'JWT expired', name: 'AuthError' },
    })

    const result = await markGraduationScreenShown()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UNAUTHORIZED')
  })

  it('returns UPDATE_FAILED when database update fails', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    const dbError = { message: 'DB error', code: 'PGRST001' }
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: dbError }),
    })

    const result = await markGraduationScreenShown()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UPDATE_FAILED')
  })

  it('returns success when graduation screen marked shown', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    const result = await markGraduationScreenShown()

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ success: true })
  })

  it('calls update with graduation_screen_shown = true', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-456' } },
      error: null,
    })

    const updateMock = vi.fn().mockReturnThis()
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    mockSupabase.from.mockReturnValue({
      update: updateMock,
      eq: eqMock,
    })

    await markGraduationScreenShown()

    expect(mockSupabase.from).toHaveBeenCalledWith('clients')
    expect(updateMock).toHaveBeenCalledWith({ graduation_screen_shown: true })
    expect(eqMock).toHaveBeenCalledWith('auth_user_id', 'user-456')
  })
})
