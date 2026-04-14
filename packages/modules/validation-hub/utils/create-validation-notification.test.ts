import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@monprojetpro/supabase'

function buildSupabaseMock({
  clientAuthUserId = 'auth-user-uuid',
  insertSuccess = true,
}: {
  clientAuthUserId?: string | null
  insertSuccess?: boolean
} = {}) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: clientAuthUserId ? { auth_user_id: clientAuthUserId } : null,
                error: null,
              }),
            })),
          })),
        }
      }
      // notifications table
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue(
              insertSuccess
                ? { data: { id: 'notif-uuid-123' }, error: null }
                : { data: null, error: { message: 'Insert error' } }
            ),
          })),
        })),
      }
    }),
  }
}

describe('create-validation-notification utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('createValidationApprovedNotification', () => {
    it('should create notification and return id on success', async () => {
      vi.mocked(createServerSupabaseClient).mockResolvedValue(
        buildSupabaseMock() as never
      )

      const { createValidationApprovedNotification } = await import(
        './create-validation-notification'
      )
      const result = await createValidationApprovedNotification({
        clientId: 'client-uuid',
        title: 'Votre demande "Brief Vision" a été validée !',
        body: 'Excellent travail !',
        link: '/modules/parcours-lab',
      })

      expect(result.error).toBeNull()
      expect(result.data?.notificationId).toBe('notif-uuid-123')
    })

    it('should return NOT_FOUND error when client has no auth_user_id', async () => {
      vi.mocked(createServerSupabaseClient).mockResolvedValue(
        buildSupabaseMock({ clientAuthUserId: null }) as never
      )

      const { createValidationApprovedNotification } = await import(
        './create-validation-notification'
      )
      const result = await createValidationApprovedNotification({
        clientId: 'client-uuid',
        title: 'Test',
      })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('NOT_FOUND')
    })

    it('should return DATABASE_ERROR when insert fails', async () => {
      vi.mocked(createServerSupabaseClient).mockResolvedValue(
        buildSupabaseMock({ insertSuccess: false }) as never
      )

      const { createValidationApprovedNotification } = await import(
        './create-validation-notification'
      )
      const result = await createValidationApprovedNotification({
        clientId: 'client-uuid',
        title: 'Test',
      })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('DATABASE_ERROR')
    })
  })

  describe('createValidationRejectedNotification', () => {
    it('should create rejection notification and return id on success', async () => {
      vi.mocked(createServerSupabaseClient).mockResolvedValue(
        buildSupabaseMock() as never
      )

      const { createValidationRejectedNotification } = await import(
        './create-validation-notification'
      )
      const result = await createValidationRejectedNotification({
        clientId: 'client-uuid',
        title: 'MiKL a demandé des modifications sur "Brief Vision"',
        body: 'Veuillez préciser votre offre.',
        link: '/modules/parcours-lab',
      })

      expect(result.error).toBeNull()
      expect(result.data?.notificationId).toBe('notif-uuid-123')
    })

    it('should return NOT_FOUND error when client has no auth_user_id', async () => {
      vi.mocked(createServerSupabaseClient).mockResolvedValue(
        buildSupabaseMock({ clientAuthUserId: null }) as never
      )

      const { createValidationRejectedNotification } = await import(
        './create-validation-notification'
      )
      const result = await createValidationRejectedNotification({
        clientId: 'client-uuid',
        title: 'Test',
      })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('NOT_FOUND')
    })
  })
})
