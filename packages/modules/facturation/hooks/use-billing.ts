import { useQuery } from '@tanstack/react-query'
import type { Quote, Invoice, BillingSubscription, BillingSummary } from '../types/billing.types'

// Données lues depuis billing_sync (table miroir Story 11.2), pas appels directs Pennylane.
// Note: Les casts `as unknown as T` sont temporaires — la table billing_sync n'existe pas encore.
// Story 11.2 définira le schema billing_sync et la transformation DB→Foxeo types sera typée.
const STALE_TIME = 5 * 60 * 1_000 // 5 minutes — aligné sur le cycle polling

// ============================================================
// Query keys
// ============================================================

export const billingKeys = {
  all: ['billing'] as const,
  quotes: (clientId?: string) => ['billing', 'quotes', clientId] as const,
  invoices: (clientId?: string) => ['billing', 'invoices', clientId] as const,
  subscriptions: (clientId?: string) => ['billing', 'subscriptions', clientId] as const,
  summary: () => ['billing', 'summary'] as const,
}

// ============================================================
// Hooks
// ============================================================

export function useBillingQuotes(clientId?: string) {
  return useQuery<Quote[]>({
    queryKey: billingKeys.quotes(clientId),
    queryFn: async () => {
      const { createBrowserSupabaseClient } = await import('@foxeo/supabase')
      const supabase = createBrowserSupabaseClient()
      let query = supabase
        .from('billing_sync')
        .select('*')
        .eq('entity_type', 'quote')
        .order('created_at', { ascending: false })

      if (clientId) {
        query = query.eq('client_id', clientId)
      }

      const { data, error } = await query
      if (error) throw error
      // Cast temporaire — transformation typée en Story 11.2 quand billing_sync sera défini
      return (data ?? []) as unknown as Quote[]
    },
    staleTime: STALE_TIME,
  })
}

export function useBillingInvoices(clientId?: string) {
  return useQuery<Invoice[]>({
    queryKey: billingKeys.invoices(clientId),
    queryFn: async () => {
      const { createBrowserSupabaseClient } = await import('@foxeo/supabase')
      const supabase = createBrowserSupabaseClient()
      let query = supabase
        .from('billing_sync')
        .select('*')
        .eq('entity_type', 'invoice')
        .order('created_at', { ascending: false })

      if (clientId) {
        query = query.eq('client_id', clientId)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as unknown as Invoice[]
    },
    staleTime: STALE_TIME,
  })
}

export function useBillingSubscriptions(clientId?: string) {
  return useQuery<BillingSubscription[]>({
    queryKey: billingKeys.subscriptions(clientId),
    queryFn: async () => {
      const { createBrowserSupabaseClient } = await import('@foxeo/supabase')
      const supabase = createBrowserSupabaseClient()
      let query = supabase
        .from('billing_sync')
        .select('*')
        .eq('entity_type', 'subscription')
        .order('created_at', { ascending: false })

      if (clientId) {
        query = query.eq('client_id', clientId)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as unknown as BillingSubscription[]
    },
    staleTime: STALE_TIME,
  })
}

export function useBillingSummary() {
  return useQuery<BillingSummary>({
    queryKey: billingKeys.summary(),
    queryFn: async () => {
      const { createBrowserSupabaseClient } = await import('@foxeo/supabase')
      const supabase = createBrowserSupabaseClient()

      const { data, error } = await supabase
        .from('billing_sync')
        .select('*')
        .eq('entity_type', 'summary')
        .maybeSingle()

      if (error) throw error

      if (!data) {
        return {
          mrr: 0,
          arr: 0,
          activeSubscriptions: 0,
          pendingInvoices: 0,
          unpaidInvoices: 0,
          totalRevenue: 0,
        } satisfies BillingSummary
      }

      return data as unknown as BillingSummary
    },
    staleTime: STALE_TIME,
  })
}
