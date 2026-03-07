'use server'

import { createServerSupabaseClient } from '@foxeo/supabase'
import { pennylaneClient } from '../config/pennylane'
import { fromPennylaneQuote, fromPennylaneInvoice, fromPennylaneSubscription } from '../utils/billing-mappers'
import type {
  PennylaneCustomer,
  PennylaneQuote,
  PennylaneCustomerInvoice,
  PennylaneBillingSubscription,
  Quote,
  Invoice,
  BillingSubscription,
  ListQuotesFilters,
  ListInvoicesFilters,
  ListSubscriptionsFilters,
} from '../types/billing.types'
import type { ActionResponse, ActionError } from '@foxeo/types'

// ============================================================
// Auth check helper — returns client for reuse
// ============================================================

type AssertOperatorResult = {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> | null
  error: ActionError | null
}

async function assertOperator(): Promise<AssertOperatorResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      supabase: null,
      error: {
        message: 'Non authentifié',
        code: 'UNAUTHORIZED',
      },
    }
  }

  const { data: isOperator } = await supabase.rpc('is_operator')
  if (!isOperator) {
    return {
      supabase: null,
      error: {
        message: 'Accès réservé aux opérateurs',
        code: 'FORBIDDEN',
      },
    }
  }

  return { supabase, error: null }
}

// ============================================================
// Customer
// ============================================================

export async function createPennylaneCustomer(
  clientId: string,
  companyName: string,
  email: string
): Promise<ActionResponse<string>> {
  const { supabase, error: authError } = await assertOperator()
  if (authError || !supabase) return { data: null, error: authError }

  const result = await pennylaneClient.post<{ customer: PennylaneCustomer }>('/customers', {
    customer: {
      name: companyName,
      emails: [{ email, label: 'work' }],
    },
  })

  if (result.error) return { data: null, error: result.error }
  if (!result.data) return { data: null, error: { message: 'No data returned', code: 'EMPTY_RESPONSE' } }

  const pennylaneCustomerId = result.data.customer.id

  // Stocker le pennylane_customer_id dans la table clients (réutilise le client existant)
  const { error: dbError } = await supabase
    .from('clients')
    .update({ pennylane_customer_id: pennylaneCustomerId })
    .eq('id', clientId)

  if (dbError) {
    return {
      data: null,
      error: {
        message: 'Client Pennylane créé mais échec de la mise à jour DB',
        code: 'DB_UPDATE_ERROR',
        details: dbError,
      },
    }
  }

  return { data: pennylaneCustomerId, error: null }
}

export async function getPennylaneCustomer(
  pennylaneCustomerId: string
): Promise<ActionResponse<PennylaneCustomer>> {
  const { error: authError } = await assertOperator()
  if (authError) return { data: null, error: authError }

  const result = await pennylaneClient.get<{ customer: PennylaneCustomer }>(
    `/customers/${pennylaneCustomerId}`
  )

  if (result.error) return { data: null, error: result.error }
  if (!result.data) return { data: null, error: { message: 'No data returned', code: 'EMPTY_RESPONSE' } }

  return { data: result.data.customer, error: null }
}

// ============================================================
// Quotes
// ============================================================

export async function listQuotes(
  filters?: ListQuotesFilters
): Promise<ActionResponse<Quote[]>> {
  const { error: authError } = await assertOperator()
  if (authError) return { data: null, error: authError }

  const params = new URLSearchParams()
  if (filters?.pennylaneCustomerId) {
    params.set('filter[customer_id]', filters.pennylaneCustomerId)
  }
  if (filters?.status) {
    params.set('filter[status]', filters.status)
  }

  const path = `/quotes${params.toString() ? `?${params.toString()}` : ''}`
  const result = await pennylaneClient.get<{ quotes: PennylaneQuote[] }>(path)

  if (result.error) return { data: null, error: result.error }
  if (!result.data) return { data: null, error: { message: 'No data returned', code: 'EMPTY_RESPONSE' } }

  return { data: result.data.quotes.map(fromPennylaneQuote), error: null }
}

// ============================================================
// Invoices
// ============================================================

export async function listInvoices(
  filters?: ListInvoicesFilters
): Promise<ActionResponse<Invoice[]>> {
  const { error: authError } = await assertOperator()
  if (authError) return { data: null, error: authError }

  const params = new URLSearchParams()
  if (filters?.pennylaneCustomerId) {
    params.set('filter[customer_id]', filters.pennylaneCustomerId)
  }
  if (filters?.status) {
    params.set('filter[status]', filters.status)
  }

  const path = `/customer_invoices${params.toString() ? `?${params.toString()}` : ''}`
  const result = await pennylaneClient.get<{ customer_invoices: PennylaneCustomerInvoice[] }>(path)

  if (result.error) return { data: null, error: result.error }
  if (!result.data) return { data: null, error: { message: 'No data returned', code: 'EMPTY_RESPONSE' } }

  return { data: result.data.customer_invoices.map(fromPennylaneInvoice), error: null }
}

// ============================================================
// Subscriptions
// ============================================================

export async function listSubscriptions(
  filters?: ListSubscriptionsFilters
): Promise<ActionResponse<BillingSubscription[]>> {
  const { error: authError } = await assertOperator()
  if (authError) return { data: null, error: authError }

  const params = new URLSearchParams()
  if (filters?.pennylaneCustomerId) {
    params.set('filter[customer_id]', filters.pennylaneCustomerId)
  }
  if (filters?.status) {
    params.set('filter[status]', filters.status)
  }

  const path = `/billing_subscriptions${params.toString() ? `?${params.toString()}` : ''}`
  const result = await pennylaneClient.get<{ billing_subscriptions: PennylaneBillingSubscription[] }>(path)

  if (result.error) return { data: null, error: result.error }
  if (!result.data) return { data: null, error: { message: 'No data returned', code: 'EMPTY_RESPONSE' } }

  return { data: result.data.billing_subscriptions.map((s) => fromPennylaneSubscription(s)), error: null }
}
