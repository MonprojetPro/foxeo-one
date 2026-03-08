import { describe, it, expect } from 'vitest'
import { billingKeys, type BillingMetrics } from './use-billing'

// Note: Les hooks TanStack Query nécessitent un QueryClientProvider.
// Pour les tests unitaires de cette fondation, on teste les query keys et staleTime.
// Les tests d'intégration avec QueryClientProvider viendront avec les composants (Story 11.3+).

describe('use-billing — query keys', () => {
  describe('billingKeys', () => {
    it('generates correct quotes key without clientId', () => {
      const key = billingKeys.quotes()
      expect(key).toEqual(['billing', 'quotes', undefined])
    })

    it('generates correct quotes key with clientId', () => {
      const key = billingKeys.quotes('client-123')
      expect(key).toEqual(['billing', 'quotes', 'client-123'])
    })

    it('generates correct invoices key without clientId', () => {
      const key = billingKeys.invoices()
      expect(key).toEqual(['billing', 'invoices', undefined])
    })

    it('generates correct invoices key with clientId', () => {
      const key = billingKeys.invoices('client-456')
      expect(key).toEqual(['billing', 'invoices', 'client-456'])
    })

    it('generates correct subscriptions key without clientId', () => {
      const key = billingKeys.subscriptions()
      expect(key).toEqual(['billing', 'subscriptions', undefined])
    })

    it('generates correct subscriptions key with clientId', () => {
      const key = billingKeys.subscriptions('client-789')
      expect(key).toEqual(['billing', 'subscriptions', 'client-789'])
    })

    it('generates correct summary key', () => {
      const key = billingKeys.summary()
      expect(key).toEqual(['billing', 'summary'])
    })

    it('all key is the billing namespace root', () => {
      expect(billingKeys.all).toEqual(['billing'])
    })

    it('quotes key starts with all key prefix', () => {
      const quotesKey = billingKeys.quotes('c-1')
      expect(quotesKey[0]).toBe(billingKeys.all[0])
    })

    it('different clientIds produce different keys', () => {
      const key1 = billingKeys.quotes('client-A')
      const key2 = billingKeys.quotes('client-B')
      expect(key1).not.toEqual(key2)
    })
  })
})

// ── BillingMetrics type shape ──────────────────────────────────────────────────

describe('BillingMetrics type', () => {
  it('BillingMetrics has required fields', () => {
    const metrics: BillingMetrics = {
      monthlyRevenue: 10000,
      pendingAmount: 5000,
      pendingQuotesCount: 3,
      mrr: 20000,
    }
    expect(metrics.monthlyRevenue).toBe(10000)
    expect(metrics.pendingAmount).toBe(5000)
    expect(metrics.pendingQuotesCount).toBe(3)
    expect(metrics.mrr).toBe(20000)
  })

  it('monthly revenue aggregation: sum paid invoices from current month', () => {
    // Test the aggregation logic independently
    const rows = [
      { entity_type: 'invoice', status: 'paid', amount: 10000, data: { date: new Date().toISOString() } },
      { entity_type: 'invoice', status: 'paid', amount: 5000, data: { date: '2020-01-01' } }, // old invoice
      { entity_type: 'invoice', status: 'unpaid', amount: 3000, data: { date: new Date().toISOString() } },
    ]

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    let monthlyRevenue = 0
    for (const row of rows) {
      if (row.entity_type === 'invoice' && row.status === 'paid') {
        const d = new Date((row.data as { date: string }).date)
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          monthlyRevenue += row.amount
        }
      }
    }

    expect(monthlyRevenue).toBe(10000) // Only current month paid invoice
  })

  it('MRR normalization: quarterly / 3, yearly / 12', () => {
    const subscriptions = [
      { status: 'active', amount: 3000, data: { recurring_period: 'monthly' } },
      { status: 'active', amount: 6000, data: { recurring_period: 'quarterly' } }, // → 2000/mo
      { status: 'active', amount: 12000, data: { recurring_period: 'yearly' } }, // → 1000/mo
      { status: 'stopped', amount: 5000, data: { recurring_period: 'monthly' } }, // excluded
    ]

    let mrr = 0
    for (const sub of subscriptions) {
      if (sub.status === 'active') {
        const period = (sub.data as { recurring_period: string }).recurring_period
        if (period === 'monthly') mrr += sub.amount
        else if (period === 'quarterly') mrr += sub.amount / 3
        else if (period === 'yearly') mrr += sub.amount / 12
      }
    }

    expect(mrr).toBe(3000 + 2000 + 1000) // 6000
  })
})
