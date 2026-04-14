import { useQuery } from '@tanstack/react-query'
import type { Quote, Invoice, BillingSubscription, BillingSummary, BillingSyncRow } from '../types/billing.types'

// Données lues depuis billing_sync (table miroir Story 11.2), pas appels directs Pennylane.
// Note: Les casts `as unknown as T` sont temporaires — la table billing_sync n'existe pas encore.
// Story 11.2 définira le schema billing_sync et la transformation DB→MonprojetPro types sera typée.
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
      const { createBrowserSupabaseClient } = await import('@monprojetpro/supabase')
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
      const { createBrowserSupabaseClient } = await import('@monprojetpro/supabase')
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
      const { createBrowserSupabaseClient } = await import('@monprojetpro/supabase')
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

// Lecture des lignes brutes billing_sync pour affichage dans les listes (Story 11.3)
export function useBillingSyncRows(entityType: 'quote' | 'invoice' | 'subscription', clientId?: string) {
  return useQuery<BillingSyncRow[]>({
    queryKey: ['billing', 'sync-rows', entityType, clientId],
    queryFn: async () => {
      const { createBrowserSupabaseClient } = await import('@monprojetpro/supabase')
      const supabase = createBrowserSupabaseClient()
      let query = supabase
        .from('billing_sync')
        .select('id, entity_type, pennylane_id, client_id, status, amount, data, last_synced_at, created_at, updated_at')
        .eq('entity_type', entityType)
        .order('created_at', { ascending: false })

      if (clientId) {
        query = query.eq('client_id', clientId)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as BillingSyncRow[]
    },
    staleTime: STALE_TIME,
  })
}

export function useBillingSummary() {
  return useQuery<BillingSummary>({
    queryKey: billingKeys.summary(),
    queryFn: async () => {
      const { createBrowserSupabaseClient } = await import('@monprojetpro/supabase')
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

// ── Métriques financières agrégées pour le Hub (Story 11.5 / AC #4) ──────────

export type BillingMetrics = {
  /** CA mensuel : SUM amount WHERE entity_type='invoice' AND status='paid' AND mois courant */
  monthlyRevenue: number
  /** Montant en attente : SUM amount WHERE entity_type='invoice' AND status='unpaid' */
  pendingAmount: number
  /** Nombre de devis en cours : COUNT WHERE entity_type='quote' AND status='pending' */
  pendingQuotesCount: number
  /** MRR : SUM abonnements actifs mensualises */
  mrr: number
}

export function useBillingMetrics() {
  return useQuery<BillingMetrics>({
    queryKey: ['billing', 'metrics'],
    queryFn: async () => {
      const { createBrowserSupabaseClient } = await import('@monprojetpro/supabase')
      const supabase = createBrowserSupabaseClient()

      const { data, error } = await supabase
        .from('billing_sync')
        .select('entity_type, status, amount, data')
        .in('entity_type', ['invoice', 'quote', 'subscription'])

      if (error) throw error

      const rows = data ?? []
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      let monthlyRevenue = 0
      let pendingAmount = 0
      let pendingQuotesCount = 0
      let mrr = 0

      for (const row of rows) {
        const amount = row.amount ?? 0
        const rowData = row.data as Record<string, unknown>

        if (row.entity_type === 'invoice') {
          if (row.status === 'paid') {
            // CA mensuel: uniquement mois courant
            const dateStr = (rowData.date ?? rowData.updated_at) as string | undefined
            if (dateStr) {
              const d = new Date(dateStr)
              if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                monthlyRevenue += amount
              }
            }
          } else if (row.status === 'unpaid') {
            pendingAmount += amount
          }
        } else if (row.entity_type === 'quote') {
          if (row.status === 'pending') {
            pendingQuotesCount++
          }
        } else if (row.entity_type === 'subscription') {
          if (row.status === 'active') {
            // Normaliser en mensuel selon la période
            const period = (rowData.recurring_period ?? 'monthly') as string
            if (period === 'monthly') {
              mrr += amount
            } else if (period === 'quarterly') {
              mrr += amount / 3
            } else if (period === 'yearly') {
              mrr += amount / 12
            }
          }
        }
      }

      return { monthlyRevenue, pendingAmount, pendingQuotesCount, mrr }
    },
    staleTime: STALE_TIME,
  })
}
