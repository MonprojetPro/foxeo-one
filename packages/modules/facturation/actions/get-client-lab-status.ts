'use server'

import { assertOperator } from './assert-operator'
import type { ActionResponse } from '@monprojetpro/types'

export type ClientLabStatus = {
  labPaid: boolean
  labPaidAt: string | null
  labAmount: number
  invoiceSent: boolean
  invoiceSentAt: string | null
  dashboardActivated: boolean
  // Pennylane
  pennylaneCustomerId: string | null
  clientEmail: string
  clientCompany: string | null
}

// Retourne le statut paiement Lab + process pour un client donné
export async function getClientLabStatus(
  clientId: string
): Promise<ActionResponse<ClientLabStatus>> {
  const { supabase, error: authError } = await assertOperator()
  if (authError || !supabase) return { data: null, error: authError }

  const { data, error: dbError } = await supabase
    .from('clients')
    .select('lab_paid, lab_paid_at, lab_amount, lab_invoice_sent_at, pennylane_customer_id, email, company, client_configs(dashboard_type)')
    .eq('id', clientId)
    .single()

  if (dbError || !data) {
    return {
      data: null,
      error: { message: 'Client introuvable', code: 'CLIENT_NOT_FOUND', details: dbError },
    }
  }

  const cfg = Array.isArray(data.client_configs) ? data.client_configs[0] : data.client_configs
  const dashboardType = (cfg as { dashboard_type?: string } | null)?.dashboard_type ?? null
  const dashboardActivated = dashboardType === 'lab' || dashboardType === 'one'

  return {
    data: {
      labPaid: (data.lab_paid as boolean | null) ?? false,
      labPaidAt: (data.lab_paid_at as string | null) ?? null,
      labAmount: (data.lab_amount as number | null) ?? 0,
      invoiceSent: !!(data.lab_invoice_sent_at as string | null),
      invoiceSentAt: (data.lab_invoice_sent_at as string | null) ?? null,
      dashboardActivated,
      pennylaneCustomerId: (data.pennylane_customer_id as string | null) ?? null,
      clientEmail: (data.email as string) ?? '',
      clientCompany: (data.company as string | null) ?? null,
    },
    error: null,
  }
}
