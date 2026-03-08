'use server'

import { assertOperator } from './assert-operator'
import type { ActionResponse } from '@foxeo/types'

export type ClientLabStatus = {
  labPaid: boolean
  labPaidAt: string | null
  labAmount: number
}

// Retourne le statut paiement Lab pour un client donné (Story 11.6)
export async function getClientLabStatus(
  clientId: string
): Promise<ActionResponse<ClientLabStatus>> {
  const { supabase, error: authError } = await assertOperator()
  if (authError || !supabase) return { data: null, error: authError }

  const { data, error: dbError } = await supabase
    .from('clients')
    .select('lab_paid, lab_paid_at, lab_amount')
    .eq('id', clientId)
    .single()

  if (dbError || !data) {
    return {
      data: null,
      error: { message: 'Client introuvable', code: 'CLIENT_NOT_FOUND', details: dbError },
    }
  }

  return {
    data: {
      labPaid: (data.lab_paid as boolean | null) ?? false,
      labPaidAt: (data.lab_paid_at as string | null) ?? null,
      labAmount: (data.lab_amount as number | null) ?? 0,
    },
    error: null,
  }
}
