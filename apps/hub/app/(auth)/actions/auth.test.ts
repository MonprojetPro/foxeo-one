import { describe, it, expect } from 'vitest'
import { hubLoginSchema, mfaCodeSchema } from './auth-schemas'

describe('Hub Auth Schemas', () => {
  describe('hubLoginSchema', () => {
    it('accepts valid email and password', () => {
      const result = hubLoginSchema.safeParse({
        email: 'mikl@monprojet-pro.com',
        password: 'securepass',
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid email', () => {
      const result = hubLoginSchema.safeParse({
        email: 'not-an-email',
        password: 'securepass',
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty email', () => {
      const result = hubLoginSchema.safeParse({
        email: '',
        password: 'securepass',
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty password', () => {
      const result = hubLoginSchema.safeParse({
        email: 'mikl@monprojet-pro.com',
        password: '',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing fields', () => {
      const result = hubLoginSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('rejects null values', () => {
      const result = hubLoginSchema.safeParse({
        email: null,
        password: null,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('mfaCodeSchema', () => {
    it('accepts valid 6-digit code', () => {
      const result = mfaCodeSchema.safeParse({ code: '123456' })
      expect(result.success).toBe(true)
    })

    it('rejects code shorter than 6 digits', () => {
      const result = mfaCodeSchema.safeParse({ code: '12345' })
      expect(result.success).toBe(false)
    })

    it('rejects code longer than 6 digits', () => {
      const result = mfaCodeSchema.safeParse({ code: '1234567' })
      expect(result.success).toBe(false)
    })

    it('rejects non-numeric code', () => {
      const result = mfaCodeSchema.safeParse({ code: 'abcdef' })
      expect(result.success).toBe(false)
    })

    it('rejects mixed alpha-numeric code', () => {
      const result = mfaCodeSchema.safeParse({ code: '12ab56' })
      expect(result.success).toBe(false)
    })

    it('rejects empty code', () => {
      const result = mfaCodeSchema.safeParse({ code: '' })
      expect(result.success).toBe(false)
    })

    it('rejects missing code field', () => {
      const result = mfaCodeSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })
})
