import { describe, it, expect } from 'vitest'
import { loginSchema, signupSchema } from './schemas'

// --- Schema Validation Tests (pure, no mocking needed) ---

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({
      email: 'user@monprojet-pro.com',
      password: 'mypassword',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'mypassword',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0]?.path).toContain('email')
    }
  })

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@monprojet-pro.com',
      password: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0]?.path).toContain('password')
    }
  })

  it('rejects missing fields', () => {
    const result = loginSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('signupSchema', () => {
  it('accepts valid signup data', () => {
    const result = signupSchema.safeParse({
      email: 'new@monprojet-pro.com',
      password: 'Password1',
      confirmPassword: 'Password1',
      acceptCgu: true,
      acceptIaProcessing: false,
    })
    expect(result.success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const result = signupSchema.safeParse({
      email: 'new@monprojet-pro.com',
      password: 'Password1',
      confirmPassword: 'Password2',
      acceptCgu: true,
      acceptIaProcessing: false,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0]?.message).toContain('correspondent')
    }
  })

  it('rejects weak password (no uppercase)', () => {
    const result = signupSchema.safeParse({
      email: 'new@monprojet-pro.com',
      password: 'password1',
      confirmPassword: 'password1',
      acceptCgu: true,
      acceptIaProcessing: false,
    })
    expect(result.success).toBe(false)
  })

  it('rejects weak password (no digit)', () => {
    const result = signupSchema.safeParse({
      email: 'new@monprojet-pro.com',
      password: 'Passwordd',
      confirmPassword: 'Passwordd',
      acceptCgu: true,
      acceptIaProcessing: false,
    })
    expect(result.success).toBe(false)
  })

  it('rejects password shorter than 8 characters', () => {
    const result = signupSchema.safeParse({
      email: 'new@monprojet-pro.com',
      password: 'Pass1',
      confirmPassword: 'Pass1',
      acceptCgu: true,
      acceptIaProcessing: false,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = signupSchema.safeParse({
      email: 'bad',
      password: 'Password1',
      confirmPassword: 'Password1',
      acceptCgu: true,
      acceptIaProcessing: false,
    })
    expect(result.success).toBe(false)
  })
})
