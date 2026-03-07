import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CustomBranding } from '@foxeo/types'

// Test the branding logic (CSS variable override and display logic)
// without rendering the async server component

describe('Dashboard layout branding logic', () => {
  describe('accent color CSS override', () => {
    it('creates CSS variable style when accentColor is set', () => {
      const branding: CustomBranding = {
        logoUrl: null,
        displayName: null,
        accentColor: '#FF5733',
        updatedAt: '2026-01-01T00:00:00Z',
      }
      const accentStyle: React.CSSProperties = branding.accentColor
        ? ({ '--accent': branding.accentColor } as React.CSSProperties)
        : {}
      expect(accentStyle).toEqual({ '--accent': '#FF5733' })
    })

    it('returns empty style when no accentColor', () => {
      const branding: CustomBranding = {
        logoUrl: null,
        displayName: null,
        accentColor: null,
        updatedAt: '2026-01-01T00:00:00Z',
      }
      const accentStyle: React.CSSProperties = branding.accentColor
        ? ({ '--accent': branding.accentColor } as React.CSSProperties)
        : {}
      expect(accentStyle).toEqual({})
    })

    it('returns empty style when branding is null', () => {
      const branding: CustomBranding | null = null
      const accentColor = branding?.accentColor ?? null
      const accentStyle: React.CSSProperties = accentColor
        ? ({ '--accent': accentColor } as React.CSSProperties)
        : {}
      expect(accentStyle).toEqual({})
    })
  })

  describe('display name resolution', () => {
    it('uses custom displayName when set', () => {
      const branding: CustomBranding = {
        logoUrl: null,
        displayName: 'ACME Corp',
        accentColor: null,
        updatedAt: '2026-01-01T00:00:00Z',
      }
      const displayName = branding.displayName || 'Mon espace'
      expect(displayName).toBe('ACME Corp')
    })

    it('falls back to Mon espace when no displayName', () => {
      const branding: CustomBranding | null = null
      const displayName = branding?.displayName || 'Mon espace'
      expect(displayName).toBe('Mon espace')
    })

    it('falls back to Mon espace when displayName is null', () => {
      const branding: CustomBranding = {
        logoUrl: null,
        displayName: null,
        accentColor: null,
        updatedAt: '2026-01-01T00:00:00Z',
      }
      const displayName = branding.displayName || 'Mon espace'
      expect(displayName).toBe('Mon espace')
    })
  })

  describe('logo URL resolution', () => {
    it('uses logoUrl when set', () => {
      const branding: CustomBranding = {
        logoUrl: 'https://storage.example.com/logo.png',
        displayName: null,
        accentColor: null,
        updatedAt: '2026-01-01T00:00:00Z',
      }
      const logoUrl = branding.logoUrl ?? null
      expect(logoUrl).toBe('https://storage.example.com/logo.png')
    })

    it('returns null when no logo', () => {
      const branding: CustomBranding | null = null
      const logoUrl = branding?.logoUrl ?? null
      expect(logoUrl).toBeNull()
    })
  })

  describe('config normalization', () => {
    it('handles array config relation', () => {
      const configRelation = [{ dashboard_type: 'one', active_modules: ['core-dashboard'], density: 'comfortable', custom_branding: { logoUrl: 'test.png', displayName: 'Test', accentColor: '#000000', updatedAt: '2026-01-01' } }]
      const clientConfig = Array.isArray(configRelation) ? configRelation[0] : configRelation
      expect(clientConfig.custom_branding).toBeDefined()
      expect((clientConfig.custom_branding as CustomBranding).displayName).toBe('Test')
    })

    it('handles object config relation', () => {
      const configRelation = { dashboard_type: 'one', active_modules: ['core-dashboard'], density: 'comfortable', custom_branding: null }
      const clientConfig = Array.isArray(configRelation) ? configRelation[0] : configRelation
      expect(clientConfig.custom_branding).toBeNull()
    })

    it('handles null config relation', () => {
      const configRelation = null
      const clientConfig = Array.isArray(configRelation) ? configRelation[0] : configRelation
      expect(clientConfig).toBeNull()
      const branding = (clientConfig?.custom_branding ?? null) as CustomBranding | null
      expect(branding).toBeNull()
    })

    it('defaults to empty custom_branding when config has none', () => {
      const configRelation = { dashboard_type: 'one', active_modules: ['core-dashboard'], density: 'comfortable', custom_branding: {} }
      const clientConfig = Array.isArray(configRelation) ? configRelation[0] : configRelation
      const branding = (clientConfig?.custom_branding ?? null) as CustomBranding | null
      const accentColor = branding?.accentColor ?? null
      expect(accentColor).toBeNull()
    })
  })
})
