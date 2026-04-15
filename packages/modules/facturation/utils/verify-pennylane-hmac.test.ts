import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { verifyPennylaneHmac } from './verify-pennylane-hmac'

const SECRET = 'test-secret-123'
const BODY = '{"invoice_id":"inv_42","status":"paid"}'

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body, 'utf8').digest('hex')
}

describe('verifyPennylaneHmac', () => {
  it('accepts a valid signature', () => {
    const sig = sign(BODY, SECRET)
    expect(verifyPennylaneHmac(BODY, sig, SECRET)).toBe(true)
  })

  it('is case insensitive for the provided signature', () => {
    const sig = sign(BODY, SECRET).toUpperCase()
    expect(verifyPennylaneHmac(BODY, sig, SECRET)).toBe(true)
  })

  it('rejects a wrong signature', () => {
    expect(verifyPennylaneHmac(BODY, 'deadbeef', SECRET)).toBe(false)
  })

  it('rejects when body is tampered', () => {
    const sig = sign(BODY, SECRET)
    expect(verifyPennylaneHmac(BODY + 'x', sig, SECRET)).toBe(false)
  })

  it('rejects when secret is wrong', () => {
    const sig = sign(BODY, SECRET)
    expect(verifyPennylaneHmac(BODY, sig, 'other-secret')).toBe(false)
  })

  it('rejects null signature', () => {
    expect(verifyPennylaneHmac(BODY, null, SECRET)).toBe(false)
  })

  it('rejects null secret', () => {
    const sig = sign(BODY, SECRET)
    expect(verifyPennylaneHmac(BODY, sig, null)).toBe(false)
  })

  it('rejects signature of wrong length without throwing', () => {
    expect(verifyPennylaneHmac(BODY, 'abc', SECRET)).toBe(false)
  })

  it('rejects non-hex signature without throwing', () => {
    const fakeHex = 'z'.repeat(64)
    expect(verifyPennylaneHmac(BODY, fakeHex, SECRET)).toBe(false)
  })
})
