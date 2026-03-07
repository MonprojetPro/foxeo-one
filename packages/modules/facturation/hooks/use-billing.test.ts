import { describe, it, expect } from 'vitest'
import { billingKeys } from './use-billing'

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
