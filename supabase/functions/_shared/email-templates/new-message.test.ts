import { describe, it, expect } from 'vitest'
import { newMessageEmailTemplate } from './new-message'

describe('newMessageEmailTemplate', () => {
  it('should render email for client with sender name', () => {
    const html = newMessageEmailTemplate({
      recipientName: 'Alice',
      senderName: 'MiKL',
      messagePreview: 'Bonjour, voici les retours...',
      platformUrl: 'https://lab.monprojet-pro.com/chat',
      recipientType: 'client',
    })
    expect(html).toContain('Alice')
    expect(html).toContain('MiKL')
    expect(html).toContain('Bonjour, voici les retours...')
    expect(html).toContain('https://lab.monprojet-pro.com/chat')
    expect(html).toContain('nouveau message')
    expect(html).toContain('<!DOCTYPE html>')
  })

  it('should render email for operator (MiKL)', () => {
    const html = newMessageEmailTemplate({
      recipientName: 'MiKL',
      senderName: 'Alice Dupont',
      messagePreview: 'Bonjour MiKL, j\'ai une question...',
      platformUrl: 'https://hub.monprojet-pro.com/chat',
      recipientType: 'operator',
    })
    expect(html).toContain('Alice Dupont')
    expect(html).toContain('MiKL')
  })

  it('should truncate long message preview', () => {
    const longMessage = 'A'.repeat(300)
    const html = newMessageEmailTemplate({
      recipientName: 'Alice',
      senderName: 'MiKL',
      messagePreview: longMessage,
      platformUrl: 'https://lab.monprojet-pro.com',
      recipientType: 'client',
    })
    // Should not include more than 200 chars of preview
    expect(html.indexOf('A'.repeat(201))).toBe(-1)
  })
})
