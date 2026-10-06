'use server'

import { assertOperator } from './assert-operator'
import type { ActionResponse } from '@monprojetpro/types'
import type { ClientWithPennylane } from '../types/billing.types'

// Retourne les clients actifs pour les dropdowns de facturation (devis, facture, abonnement).
//
// T-036 — le filtre `.not('pennylane_customer_id', 'is', null)' a ete RETIRE le 2026-10-06.
// Il contredisait le code : createAndSendQuote, createInvoice, createSubscription et
// sendLabInvoice creent tous le compte Pennylane a la volee quand il manque
// (via createPennylaneCustomer). Le filtre rendait donc tout client jamais facture
// INVISIBLE dans le formulaire, avec le message trompeur « Creez d'abord le client dans
// Pennylane » — une impasse pour un premier client reel, constatee sur CSE HABITAT 77.
export async function getClientsWithPennylane(): Promise<ActionResponse<ClientWithPennylane[]>> {
  const { supabase, error: authError } = await assertOperator()
  if (authError || !supabase) return { data: null, error: authError }

  const { data, error: dbError } = await supabase
    .from('clients')
    .select('id, name, company, email, pennylane_customer_id, lab_paid, lab_paid_at')
    .eq('status', 'active')
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
    pennylaneCustomerId: (row.pennylane_customer_id as string | null) ?? null,
    labPaid: (row.lab_paid as boolean | null) ?? false,
    labPaidAt: (row.lab_paid_at as string | null) ?? null,
  }))

  return { data: clients, error: null }
}
