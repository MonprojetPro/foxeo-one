import { createHmac, timingSafeEqual } from 'node:crypto'

// Pennylane signe les webhooks avec HMAC-SHA256 du body brut, hex encoding
// Header: x-pennylane-signature
// Secret: process.env.PENNYLANE_WEBHOOK_SECRET

export function verifyPennylaneHmac(
  rawBody: string,
  signature: string | null,
  secret: string | null
): boolean {
  if (!signature || !secret) return false

  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')

  const provided = signature.trim().toLowerCase()
  const computed = expected.toLowerCase()

  if (provided.length !== computed.length) return false

  try {
    return timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(computed, 'hex'))
  } catch {
    return false
  }
}
