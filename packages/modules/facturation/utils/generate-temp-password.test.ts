import { describe, it, expect } from 'vitest'
import {
  generateSecureTemporaryPassword,
  TEMP_PASSWORD_LENGTH,
} from './generate-temp-password'

describe('generateSecureTemporaryPassword', () => {
  it('returns a string of the default length', () => {
    const pwd = generateSecureTemporaryPassword()
    expect(pwd).toHaveLength(TEMP_PASSWORD_LENGTH)
  })

  it('uses an urlsafe alphabet without ambiguous chars (0, O, I, l, 1)', () => {
    const pwd = generateSecureTemporaryPassword(200)
    for (const forbidden of ['0', 'O', 'I', 'l', '1']) {
      expect(pwd).not.toContain(forbidden)
    }
    // All chars must be urlsafe: A-Z, a-z, 2-9, '-', '_'
    expect(pwd).toMatch(/^[A-Za-z2-9\-_]+$/)
  })

  it('returns different values across calls (randomness smoke test)', () => {
    const samples = new Set<string>()
    for (let i = 0; i < 50; i++) {
      samples.add(generateSecureTemporaryPassword())
    }
    // 50 samples of 16 chars each should all differ
    expect(samples.size).toBe(50)
  })

  it('supports custom length', () => {
    expect(generateSecureTemporaryPassword(32)).toHaveLength(32)
    expect(generateSecureTemporaryPassword(8)).toHaveLength(8)
  })
})
