import { describe, it, expect } from 'vitest'
import {
  isBlockedInImpersonation,
  IMPERSONATION_BLOCKED_ACTIONS,
  IMPERSONATION_COOKIE_NAME,
  IMPERSONATION_MAX_DURATION_MS,
} from './impersonation-guards'

describe('impersonation-guards', () => {
  describe('isBlockedInImpersonation', () => {
    it('should block password change', () => {
      expect(isBlockedInImpersonation('change_password')).toBe(true)
    })

    it('should block account deletion', () => {
      expect(isBlockedInImpersonation('delete_account')).toBe(true)
    })

    it('should block email update', () => {
      expect(isBlockedInImpersonation('update_email')).toBe(true)
    })

    it('should block module disable', () => {
      expect(isBlockedInImpersonation('disable_module')).toBe(true)
    })

    it('should block document deletion', () => {
      expect(isBlockedInImpersonation('delete_document')).toBe(true)
    })

    it('should block chat deletion', () => {
      expect(isBlockedInImpersonation('delete_chat')).toBe(true)
    })

    it('should block brief deletion', () => {
      expect(isBlockedInImpersonation('delete_brief')).toBe(true)
    })

    it('should allow read actions', () => {
      expect(isBlockedInImpersonation('view_dashboard')).toBe(false)
    })

    it('should allow navigation', () => {
      expect(isBlockedInImpersonation('navigate')).toBe(false)
    })

    it('should allow message sending', () => {
      expect(isBlockedInImpersonation('send_message')).toBe(false)
    })
  })

  describe('constants', () => {
    it('should have correct cookie name', () => {
      expect(IMPERSONATION_COOKIE_NAME).toBe('mpro-impersonation-session')
    })

    it('should have 1 hour max duration', () => {
      expect(IMPERSONATION_MAX_DURATION_MS).toBe(3600000)
    })

    it('should have at least 5 blocked actions', () => {
      expect(IMPERSONATION_BLOCKED_ACTIONS.length).toBeGreaterThanOrEqual(5)
    })
  })
})
