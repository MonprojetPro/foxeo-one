'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
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
  CreatePennylaneCustomerInput,
} from '../types/billing.types'
import type { ActionResponse, ActionError } from '@monprojetpro/types'

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
  email: string,
  billingAddress?: CreatePennylaneCustomerInput['billingAddress']
): Promise<ActionResponse<string>> {
  const { supabase, error: authError } = await assertOperator()
  if (authError || !supabase) return { data: null, error: authError }

  if (!email || email.trim() === '') {
    return { data: null, error: { message: 'Email client requis pour créer un compte Pennylane', code: 'MISSING_EMAIL' } }
  }

  // V2 API : endpoint company_customers, emails = string[], billing_address obligatoire
  const result = await pennylaneClient.post<PennylaneCustomer>('/company_customers', {
    name: companyName,
    emails: [email.trim()],
    billing_address: {
      address: billingAddress?.address ?? '',
      postal_code: billingAddress?.postalCode ?? '',
      city: billingAddress?.city ?? '',
      country_alpha2: billingAddress?.countryAlpha2 ?? 'FR',
    },
  })

  if (result.error) return { data: null, error: result.error }
  if (!result.data) return { data: null, error: { message: 'No data returned', code: 'EMPTY_RESPONSE' } }

  // V2 API : la réponse peut être directe { id, ... } ou wrappée { company_customer: { id, ... } }
  const rawData = result.data as Record<string, unknown>
  const customerData = (rawData.company_customer as Record<string, unknown> | undefined) ?? rawData
  const pennylaneCustomerId = customerData.id != null ? String(customerData.id) : undefined

  if (!pennylaneCustomerId || pennylaneCustomerId === 'undefined') {
    return { data: null, error: { message: 'ID Pennylane invalide dans la réponse API', code: 'INVALID_RESPONSE' } }
  }

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

  // V2 : /customers/{id} fonctionne (alias de /company_customers/{id})
  const result = await pennylaneClient.get<PennylaneCustomer>(
    `/customers/${pennylaneCustomerId}`
  )

  if (result.error) return { data: null, error: result.error }
  if (!result.data) return { data: null, error: { message: 'No data returned', code: 'EMPTY_RESPONSE' } }

  return { data: result.data, error: null }
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
  // V2 : réponse { items: [...], has_more: bool, next_cursor: null }
  const result = await pennylaneClient.get<{ items: PennylaneQuote[] }>(path)

  if (result.error) return { data: null, error: result.error }
  if (!result.data) return { data: null, error: { message: 'No data returned', code: 'EMPTY_RESPONSE' } }

  return { data: result.data.items.map(fromPennylaneQuote), error: null }
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
  // V2 : réponse { items: [...] }
  const result = await pennylaneClient.get<{ items: PennylaneCustomerInvoice[] }>(path)

  if (result.error) return { data: null, error: result.error }
  if (!result.data) return { data: null, error: { message: 'No data returned', code: 'EMPTY_RESPONSE' } }

  return { data: result.data.items.map(fromPennylaneInvoice), error: null }
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
  // V2 : réponse { items: [...] }
  const result = await pennylaneClient.get<{ items: PennylaneBillingSubscription[] }>(path)

  if (result.error) return { data: null, error: result.error }
  if (!result.data) return { data: null, error: { message: 'No data returned', code: 'EMPTY_RESPONSE' } }

  return { data: result.data.items.map((s) => fromPennylaneSubscription(s)), error: null }
}
