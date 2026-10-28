import { describe, it, expect } from 'vitest'
import { CHANNEL_PATTERNS } from './realtime'

describe('CHANNEL_PATTERNS', () => {
  it('generates client notification channel', () => {
    expect(CHANNEL_PATTERNS.clientNotifications('abc-123')).toBe(
      'client:notifications:abc-123'
    )
  })

  it('generates chat room channel', () => {
    expect(CHANNEL_PATTERNS.chatRoom('client-456')).toBe(
      'chat:room:client-456'
    )
  })

  it('no longer exposes a public presence channel name (T-064)', () => {
    expect('presence' in CHANNEL_PATTERNS).toBe(false)
  })

  it('generates client config channel', () => {
    expect(CHANNEL_PATTERNS.clientConfig('client-789')).toBe(
      'client:config:client-789'
    )
  })
})
