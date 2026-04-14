import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'

describe('update-parcours-step utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('markStepCompleted', () => {
    it('should return success when step is marked completed', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({ error: null })),
          })),
        })),
      }
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

      const { markStepCompleted } = await import('./update-parcours-step')
      const result = await markStepCompleted('step-uuid-123')

      expect(result.error).toBeNull()
      expect(result.data).toEqual({ stepId: 'step-uuid-123' })
    })

    it('should return error when database fails', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({ error: { message: 'DB error' } })),
          })),
        })),
      }
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

      const { markStepCompleted } = await import('./update-parcours-step')
      const result = await markStepCompleted('step-uuid-123')

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('DATABASE_ERROR')
    })
  })

  describe('findNextStep', () => {
    it('should return next step id when locked step exists', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: 'next-step-id' },
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          })),
        })),
      }
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

      const { findNextStep } = await import('./update-parcours-step')
      const result = await findNextStep('parcours-uuid-123')

      expect(result.error).toBeNull()
      expect(result.data?.stepId).toBe('next-step-id')
    })

    it('should return null stepId when no locked steps remain', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null,
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          })),
        })),
      }
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

      const { findNextStep } = await import('./update-parcours-step')
      const result = await findNextStep('parcours-uuid-123')

      expect(result.error).toBeNull()
      expect(result.data?.stepId).toBeNull()
    })

    it('should return error when database fails', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null,
                      error: { message: 'DB error' },
                    }),
                  })),
                })),
              })),
            })),
          })),
        })),
      }
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

      const { findNextStep } = await import('./update-parcours-step')
      const result = await findNextStep('parcours-uuid-123')

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('DATABASE_ERROR')
    })
  })

  describe('isLastStep', () => {
    it('should return isLast=true when no locked steps remain', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          })),
        })),
      }
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

      const { isLastStep } = await import('./update-parcours-step')
      const result = await isLastStep('parcours-uuid-123')

      expect(result.error).toBeNull()
      expect(result.data?.isLast).toBe(true)
    })

    it('should return isLast=false when locked steps remain', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({
                  data: [{ id: 'next-step' }],
                  error: null,
                }),
              })),
            })),
          })),
        })),
      }
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

      const { isLastStep } = await import('./update-parcours-step')
      const result = await isLastStep('parcours-uuid-123')

      expect(result.error).toBeNull()
      expect(result.data?.isLast).toBe(false)
    })
  })

  describe('markParcoursCompleted', () => {
    it('should return success when parcours is marked completed', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({ error: null })),
          })),
        })),
      }
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

      const { markParcoursCompleted } = await import('./update-parcours-step')
      const result = await markParcoursCompleted('parcours-uuid-123')

      expect(result.error).toBeNull()
      expect(result.data).toEqual({ parcoursId: 'parcours-uuid-123' })
    })

    it('should return error when database fails', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({ error: { message: 'DB error' } })),
          })),
        })),
      }
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

      const { markParcoursCompleted } = await import('./update-parcours-step')
      const result = await markParcoursCompleted('parcours-uuid-123')

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('DATABASE_ERROR')
    })
  })
})
