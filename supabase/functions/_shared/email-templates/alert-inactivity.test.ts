import { describe, it, expect } from 'vitest'
import { alertInactivityEmailTemplate } from './alert-inactivity'

describe('alertInactivityEmailTemplate', () => {
  it('should render client name and days count', () => {
    const html = alertInactivityEmailTemplate({
      clientName: 'Sophie Martin',
      daysSinceActivity: 14,
      lastActivityDate: '2026-02-03',
      platformUrl: 'https://hub.monprojet-pro.com/clients/123',
    })
    expect(html).toContain('Sophie Martin')
    expect(html).toContain('14')
    expect(html).toContain('2026-02-03')
    expect(html).toContain('https://hub.monprojet-pro.com/clients/123')
    expect(html).toContain('<!DOCTYPE html>')
  })

  it('should include inactivity warning messaging', () => {
    const html = alertInactivityEmailTemplate({
      clientName: 'Jean Paul',
      daysSinceActivity: 7,
      lastActivityDate: '2026-02-10',
      platformUrl: 'https://hub.monprojet-pro.com/clients/456',
    })
    expect(html).toContain('inactif')
    expect(html).toContain('Jean Paul')
  })
})
