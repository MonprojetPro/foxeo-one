import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock types
vi.mock('@monprojetpro/types', () => ({
  successResponse: <T>(data: T) => ({ data, error: null }),
  errorResponse: (message: string, code: string, details?: unknown) => ({
    data: null,
    error: { message, code, details },
  }),
}))

describe('withOptimisticLock', () => {
  const mockSingle = vi.fn()
  const mockSelect = vi.fn(() => ({ single: mockSingle }))
  const mockEqUpdatedAt = vi.fn(() => ({ select: mockSelect }))
  const mockEqId = vi.fn(() => ({ eq: mockEqUpdatedAt, select: mockSelect }))
  const mockUpdate = vi.fn(() => ({ eq: mockEqId }))
  const mockFrom = vi.fn(() => ({ update: mockUpdate }))

  const mockSupabase = { from: mockFrom } as never

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset chain defaults: by default mockEqId returns with eq (non-force path)
    mockEqId.mockReturnValue({ eq: mockEqUpdatedAt, select: mockSelect })
  })

  it('should update successfully when updated_at matches (no conflict)', async () => {
    const { withOptimisticLock } = await import('./optimistic-lock')

    mockSingle.mockResolvedValue({
      data: { id: 'abc', name: 'Updated', updated_at: '2026-02-18T12:00:00Z' },
      error: null,
    })

    const result = await withOptimisticLock(
      mockSupabase,
      'clients',
      'abc',
      '2026-02-18T10:00:00Z',
      { name: 'Updated' }
    )

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ id: 'abc', name: 'Updated', updated_at: '2026-02-18T12:00:00Z' })
    expect(mockFrom).toHaveBeenCalledWith('clients')
    expect(mockEqId).toHaveBeenCalledWith('id', 'abc')
    expect(mockEqUpdatedAt).toHaveBeenCalledWith('updated_at', '2026-02-18T10:00:00Z')
  })

  it('should return CONFLICT when updated_at does not match (PGRST116)', async () => {
    const { withOptimisticLock } = await import('./optimistic-lock')

    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    })

    const result = await withOptimisticLock(
      mockSupabase,
      'clients',
      'abc',
      '2026-02-18T10:00:00Z',
      { name: 'Updated' }
    )

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('CONFLICT')
    expect(result.error?.message).toContain('modifi')
  })

  it('should return DATABASE_ERROR for non-conflict DB errors', async () => {
    const { withOptimisticLock } = await import('./optimistic-lock')

    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST301', message: 'Connection failed' },
    })

    const result = await withOptimisticLock(
      mockSupabase,
      'clients',
      'abc',
      '2026-02-18T10:00:00Z',
      { name: 'Updated' }
    )

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DATABASE_ERROR')
  })

  it('should skip updated_at check when force option is true', async () => {
    const { withOptimisticLock } = await import('./optimistic-lock')

    // When force=true, mockEqId should return select directly (no eq for updated_at)
    mockEqId.mockReturnValue({ eq: mockEqUpdatedAt, select: mockSelect })

    mockSingle.mockResolvedValue({
      data: { id: 'abc', name: 'Forced', updated_at: '2026-02-18T14:00:00Z' },
      error: null,
    })

    const result = await withOptimisticLock(
      mockSupabase,
      'clients',
      'abc',
      '2026-02-18T10:00:00Z',
      { name: 'Forced' },
      { force: true }
    )

    expect(result.error).toBeNull()
    expect(result.data).toEqual({ id: 'abc', name: 'Forced', updated_at: '2026-02-18T14:00:00Z' })
    // updated_at eq should NOT have been called
    expect(mockEqUpdatedAt).not.toHaveBeenCalled()
  })

  it('should always return { data, error } format', async () => {
    const { withOptimisticLock } = await import('./optimistic-lock')

    mockSingle.mockResolvedValue({
      data: { id: 'abc' },
      error: null,
    })

    const result = await withOptimisticLock(
      mockSupabase,
      'clients',
      'abc',
      '2026-02-18T10:00:00Z',
      { name: 'Test' }
    )

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('error')
  })

  it('should pass updateData correctly to supabase update', async () => {
    const { withOptimisticLock } = await import('./optimistic-lock')

    mockSingle.mockResolvedValue({
      data: { id: 'abc', name: 'New', email: 'new@test.com' },
      error: null,
    })

    await withOptimisticLock(
      mockSupabase,
      'clients',
      'abc',
      '2026-02-18T10:00:00Z',
      { name: 'New', email: 'new@test.com' }
    )

    expect(mockUpdate).toHaveBeenCalledWith({ name: 'New', email: 'new@test.com' })
  })

  it('should work with different table names', async () => {
    const { withOptimisticLock } = await import('./optimistic-lock')

    mockSingle.mockResolvedValue({
      data: { id: 'note-1', content: 'Updated note' },
      error: null,
    })

    await withOptimisticLock(
      mockSupabase,
      'client_notes',
      'note-1',
      '2026-02-18T10:00:00Z',
      { content: 'Updated note' }
    )

    expect(mockFrom).toHaveBeenCalledWith('client_notes')
  })
})
