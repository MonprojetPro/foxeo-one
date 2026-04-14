'use server'

import { assertOperator } from './assert-operator'
import type { ActionResponse } from '@monprojetpro/types'
import type { ClientWithPennylane } from '../types/billing.types'

// Retourne les clients actifs ayant un pennylane_customer_id (pour le dropdown du formulaire devis)
export async function getClientsWithPennylane(): Promise<ActionResponse<ClientWithPennylane[]>> {
  const { supabase, error: authError } = await assertOperator()
  if (authError || !supabase) return { data: null, error: authError }

  const { data, error: dbError } = await supabase
    .from('clients')
    .select('id, name, company, email, pennylane_customer_id, lab_paid, lab_paid_at')
    .eq('status', 'active')
    .not('pennylane_customer_id', 'is', null)
    .order('name')

  if (dbError) {
    return {
      data: null,
      error: {
        message: 'Erreur lors de la récupération des clients',
        code: 'DB_ERROR',
        details: dbError,
      },
    }
  }

  const clients: ClientWithPennylane[] = (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    company: row.company as string | null,
    email: row.email as string,
    pennylaneCustomerId: row.pennylane_customer_id as string,
    labPaid: (row.lab_paid as boolean | null) ?? false,
    labPaidAt: (row.lab_paid_at as string | null) ?? null,
  }))

  return { data: clients, error: null }
}
