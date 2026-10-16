import { describe, it, expect } from 'vitest'
import { isPublicPath, isStaticOrApi, PUBLIC_PATHS } from './middleware'

describe('Hub Middleware Helpers', () => {
  describe('PUBLIC_PATHS', () => {
    it('includes /login', () => {
      expect(PUBLIC_PATHS).toContain('/login')
    })

    it('includes /setup-mfa', () => {
      expect(PUBLIC_PATHS).toContain('/setup-mfa')
    })

    it('includes /auth/callback', () => {
      expect(PUBLIC_PATHS).toContain('/auth/callback')
    })
  })

  describe('isPublicPath', () => {
    it('returns true for /login', () => {
      expect(isPublicPath('/login')).toBe(true)
    })

    it('returns true for /login/verify-mfa', () => {
      expect(isPublicPath('/login/verify-mfa')).toBe(true)
    })

    it('returns true for /setup-mfa', () => {
      expect(isPublicPath('/setup-mfa')).toBe(true)
    })

    it('returns true for /auth/callback', () => {
      expect(isPublicPath('/auth/callback')).toBe(true)
    })

    it('returns false for /', () => {
      expect(isPublicPath('/')).toBe(false)
    })

    it('returns false for /modules/core-dashboard', () => {
      expect(isPublicPath('/modules/core-dashboard')).toBe(false)
    })

    it('returns false for /settings', () => {
      expect(isPublicPath('/settings')).toBe(false)
    })

    it('returns false for /api/something', () => {
      expect(isPublicPath('/api/something')).toBe(false)
    })
  })

  describe('isStaticOrApi', () => {
    it('returns true for /_next paths', () => {
      expect(isStaticOrApi('/_next/static/chunk.js')).toBe(true)
    })

    it('returns true for /api/webhooks paths', () => {
      expect(isStaticOrApi('/api/webhooks/stripe')).toBe(true)
    })

    /**
     * ⚠️ TEST DE VERROUILLAGE — défaut prouvé par curl le 2026-10-16.
     * La route de rattrapage des transcriptions recevait un 307 vers le
     * login : pg_cron récupérait la page HTML et ne déclenchait rien, tout en
     * rapportant « succeeded » à chaque passage. Elle se protège par
     * CRON_SECRET, pas par une session — qu'une machine ne peut de toute
     * façon pas présenter.
     */
    it('laisse passer les routes de cron — une machine ne peut pas se connecter', () => {
      expect(isStaticOrApi('/api/cron/sync-meeting-results')).toBe(true)
    })

    it('returns true for /favicon.ico', () => {
      expect(isStaticOrApi('/favicon.ico')).toBe(true)
    })

    it('returns false for /login', () => {
      expect(isStaticOrApi('/login')).toBe(false)
    })

    it('returns false for /', () => {
      expect(isStaticOrApi('/')).toBe(false)
    })

    it('returns false for /api/something', () => {
      expect(isStaticOrApi('/api/something')).toBe(false)
    })

    it('returns false for /modules/chat', () => {
      expect(isStaticOrApi('/modules/chat')).toBe(false)
    })
  })
})
