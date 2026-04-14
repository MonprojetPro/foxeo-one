import { describe, it, expect } from 'vitest'
import { paymentFailedEmailTemplate } from './payment-failed'

describe('paymentFailedEmailTemplate', () => {
  it('should render client email with amount info', () => {
    const html = paymentFailedEmailTemplate({
      recipientName: 'Alice Dupont',
      amount: '199,00',
      currency: 'EUR',
      platformUrl: 'https://alice.monprojet-pro.com/billing',
      recipientType: 'client',
    })
    expect(html).toContain('Alice Dupont')
    expect(html).toContain('199,00')
    expect(html).toContain('EUR')
    expect(html).toContain('https://alice.monprojet-pro.com/billing')
    expect(html).toContain('<!DOCTYPE html>')
  })

  it('should render operator alert email', () => {
    const html = paymentFailedEmailTemplate({
      recipientName: 'MiKL',
      clientName: 'Alice Dupont',
      amount: '199,00',
      currency: 'EUR',
      platformUrl: 'https://hub.monprojet-pro.com/clients/123/billing',
      recipientType: 'operator',
    })
    expect(html).toContain('MiKL')
    expect(html).toContain('Alice Dupont')
    expect(html).toContain('199,00')
  })

  it('should include payment failure messaging', () => {
    const html = paymentFailedEmailTemplate({
      recipientName: 'Alice',
      amount: '99,00',
      currency: 'EUR',
      platformUrl: 'https://alice.monprojet-pro.com',
      recipientType: 'client',
    })
    expect(html).toContain('paiement')
    expect(html).toContain('échec')
  })
})
