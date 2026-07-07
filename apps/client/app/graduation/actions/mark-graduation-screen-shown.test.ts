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
  rpc: vi.fn(),
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
    expect(mockSupabase.rpc).not.toHaveBeenCalled()
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

  it('returns UPDATE_FAILED when the RPC fails', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: { message: 'function not found', code: 'PGRST202' },
    })

    const result = await markGraduationScreenShown()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UPDATE_FAILED')
  })

  it('returns UPDATE_FAILED when no row was updated (client introuvable ou non gradué)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })
    mockSupabase.rpc.mockResolvedValue({ data: false, error: null })

    const result = await markGraduationScreenShown()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('UPDATE_FAILED')
  })

  it('returns success when the RPC confirms the update', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })
    mockSupabase.rpc.mockResolvedValue({ data: true, error: null })

    const result = await markGraduationScreenShown()

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ success: true })
  })

  it('calls the dedicated SECURITY DEFINER RPC', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-456' } },
      error: null,
    })
    mockSupabase.rpc.mockResolvedValue({ data: true, error: null })

    await markGraduationScreenShown()

    expect(mockSupabase.rpc).toHaveBeenCalledWith('fn_mark_graduation_screen_shown')
  })
})
