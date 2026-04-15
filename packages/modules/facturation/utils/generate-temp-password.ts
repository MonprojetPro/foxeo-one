import { randomBytes } from 'node:crypto'

const ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789-_'
//  (I, O, l, 1, 0 retires pour lisibilite client)

export const TEMP_PASSWORD_LENGTH = 16

export function generateSecureTemporaryPassword(length = TEMP_PASSWORD_LENGTH): string {
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return out
}
