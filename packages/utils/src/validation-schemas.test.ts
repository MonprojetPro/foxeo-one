import { describe, it, expect } from 'vitest'
import {
  emailSchema,
  passwordSchema,
  uuidSchema,
  slugSchema,
  phoneSchema,
  createClientSchema,
  updateClientSchema,
} from './validation-schemas'

describe('emailSchema', () => {
  it('accepts valid email', () => {
    expect(emailSchema.safeParse('test@monprojet-pro.com').success).toBe(true)
  })

  it('rejects invalid email', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false)
    expect(emailSchema.safeParse('').success).toBe(false)
  })
})

describe('passwordSchema', () => {
  it('accepts valid password', () => {
    expect(passwordSchema.safeParse('MonprojetPro123').success).toBe(true)
    expect(passwordSchema.safeParse('MyStr0ngPass').success).toBe(true)
  })

  it('rejects too short', () => {
    expect(passwordSchema.safeParse('Abc1').success).toBe(false)
  })

  it('rejects without uppercase', () => {
    expect(passwordSchema.safeParse('monprojetpro123').success).toBe(false)
  })

  it('rejects without lowercase', () => {
    expect(passwordSchema.safeParse('FOXEO123').success).toBe(false)
  })

  it('rejects without digit', () => {
    expect(passwordSchema.safeParse('MonprojetProPass').success).toBe(false)
  })
})

describe('uuidSchema', () => {
  it('accepts valid UUID', () => {
    expect(
      uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success
    ).toBe(true)
  })

  it('rejects invalid UUID', () => {
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false)
  })
})

describe('slugSchema', () => {
  it('accepts valid slugs', () => {
    expect(slugSchema.safeParse('my-company').success).toBe(true)
    expect(slugSchema.safeParse('monprojetpro-one-123').success).toBe(true)
  })

  it('rejects too short', () => {
    expect(slugSchema.safeParse('ab').success).toBe(false)
  })

  it('rejects uppercase', () => {
    expect(slugSchema.safeParse('My-Company').success).toBe(false)
  })

  it('rejects spaces', () => {
    expect(slugSchema.safeParse('my company').success).toBe(false)
  })
})

describe('phoneSchema', () => {
  it('accepts valid phone numbers', () => {
    expect(phoneSchema.safeParse('+33 6 12 34 56 78').success).toBe(true)
    expect(phoneSchema.safeParse('0612345678').success).toBe(true)
  })

  it('rejects invalid phone', () => {
    expect(phoneSchema.safeParse('abc').success).toBe(false)
    expect(phoneSchema.safeParse('123').success).toBe(false)
  })
})

describe('createClientSchema', () => {
  it('accepts valid client creation data', () => {
    const result = createClientSchema.safeParse({
      name: 'Jean Dupont',
      email: 'jean@acme.com',
      clientType: 'ponctuel',
    })
    expect(result.success).toBe(true)
  })

  it('accepts full data with optional fields', () => {
    const result = createClientSchema.safeParse({
      name: 'Jean Dupont',
      email: 'jean@acme.com',
      company: 'Acme Corp',
      phone: '+33 6 12 34 56 78',
      sector: 'tech',
      clientType: 'complet',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const result = createClientSchema.safeParse({
      email: 'jean@acme.com',
      clientType: 'ponctuel',
    })
    expect(result.success).toBe(false)
  })

  it('rejects name too short', () => {
    const result = createClientSchema.safeParse({
      name: 'J',
      email: 'jean@acme.com',
      clientType: 'ponctuel',
    })
    expect(result.success).toBe(false)
  })

  it('rejects name too long (>100)', () => {
    const result = createClientSchema.safeParse({
      name: 'A'.repeat(101),
      email: 'jean@acme.com',
      clientType: 'ponctuel',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing email', () => {
    const result = createClientSchema.safeParse({
      name: 'Jean Dupont',
      clientType: 'ponctuel',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email format', () => {
    const result = createClientSchema.safeParse({
      name: 'Jean Dupont',
      email: 'not-an-email',
      clientType: 'ponctuel',
    })
    expect(result.success).toBe(false)
  })

  it('defaults clientType when omitted', () => {
    const result = createClientSchema.safeParse({
      name: 'Jean Dupont',
      email: 'jean@acme.com',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.clientType).toBe('ponctuel')
    }
  })

  it('rejects invalid clientType', () => {
    const result = createClientSchema.safeParse({
      name: 'Jean Dupont',
      email: 'jean@acme.com',
      clientType: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('defaults clientType to ponctuel when using default()', () => {
    // createClientSchema has clientType with default - test that it works
    const result = createClientSchema.safeParse({
      name: 'Jean Dupont',
      email: 'jean@acme.com',
      clientType: 'ponctuel',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.clientType).toBe('ponctuel')
    }
  })

  it('has French error messages', () => {
    const result = createClientSchema.safeParse({
      name: '',
      email: '',
      clientType: 'ponctuel',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameError = result.error.issues.find(i => i.path.includes('name'))
      expect(nameError?.message).toContain('caract')
    }
  })
})

describe('updateClientSchema', () => {
  it('accepts partial update with just name', () => {
    const result = updateClientSchema.safeParse({
      name: 'Nouveau Nom',
    })
    expect(result.success).toBe(true)
  })

  it('accepts partial update with just email', () => {
    const result = updateClientSchema.safeParse({
      email: 'new@acme.com',
    })
    expect(result.success).toBe(true)
  })

  it('accepts full update', () => {
    const result = updateClientSchema.safeParse({
      name: 'Jean Dupont',
      email: 'jean@acme.com',
      company: 'Acme Corp',
      phone: '+33 6 12 34 56 78',
      sector: 'tech',
      clientType: 'complet',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object (no changes)', () => {
    const result = updateClientSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects invalid email when provided', () => {
    const result = updateClientSchema.safeParse({
      email: 'not-valid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid clientType when provided', () => {
    const result = updateClientSchema.safeParse({
      clientType: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})
