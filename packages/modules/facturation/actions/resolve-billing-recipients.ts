'use server'

import { pennylaneClient } from '../config/pennylane'
import { assertOperator } from './assert-operator'
import { resolveRecipients, type RecipientContact, type ResolvedRecipients } from '../utils/billing-recipients'
import type { ActionResponse } from '@monprojetpro/types'

// ============================================================
// resolveBillingRecipients — T-039
//
// Lit le carnet de contacts (`client_contacts`, tenu par le module CRM) et rend
// les adresses d'envoi + les noms a imprimer.
//
// ⚠️ POURQUOI LA LECTURE SE FAIT EN BASE ET PAS PAR UN IMPORT DU MODULE CRM :
// l'architecture du depot interdit a un module d'importer un autre module ;
// la communication passe par Supabase. La facturation lit donc la table
// directement — c'est le canal prevu, pas un contournement.
//
// ⚠️ POURQUOI LA SYNCHRO PENNYLANE SE FAIT A L'EMISSION, et pas a chaque
// modification du carnet : pour la meme raison — le CRM ne peut pas appeler une
// action de facturation. L'avantage est qu'AUCUN chemin d'emission ne peut
// l'oublier (facture directe, devis, abonnement, facture Lab passent tous ici),
// et que le compte Pennylane est juste au moment ou ca compte : l'envoi. L'ecran
// du carnet annonce « appliqué à chaque émission », donc le miroir ne ment pas.
// ============================================================

export type BillingRecipients = ResolvedRecipients & {
  /** true si le tableau `emails` du compte Pennylane a reellement ete aligne */
  pennylaneSynced: boolean
}

export async function resolveBillingRecipients(
  clientId: string,
  options: { pennylaneCustomerId?: string | null } = {}
): Promise<ActionResponse<BillingRecipients>> {
  const { supabase, error: authError } = await assertOperator()
  if (authError || !supabase) return { data: null, error: authError }

  if (!clientId) {
    return { data: null, error: { message: 'Client requis', code: 'VALIDATION_ERROR' } }
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('email, pennylane_customer_id')
    .eq('id', clientId)
    .maybeSingle()

  if (clientError) {
    return {
      data: null,
      error: { message: 'Lecture du client impossible', code: 'DATABASE_ERROR', details: clientError },
    }
  }

  const { data: contactRows, error: contactsError } = await supabase
    .from('client_contacts')
    .select('full_name, email, receives_invoices, show_on_invoice')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })

  // Un carnet illisible ne doit PAS bloquer une emission : on repart sur
  // l'adresse du client et on le dit dans les journaux. Mais on ne pretend pas
  // avoir lu un carnet vide — la nuance compte pour diagnostiquer.
  if (contactsError) {
    console.error('[FACTURATION:RECIPIENTS] Lecture du carnet impossible:', contactsError)
  }

  const contacts: RecipientContact[] = (contactRows ?? []).map((row) => ({
    fullName: (row.full_name as string | null) ?? '',
    email: (row.email as string | null) ?? null,
    receivesInvoices: row.receives_invoices === true,
    showOnInvoice: row.show_on_invoice === true,
  }))

  const resolved = resolveRecipients(contacts, (client?.email as string | null) ?? null)

  // Alignement du compte Pennylane. Best effort assume : si le PUT echoue, la
  // facture part quand meme — mais vers les adresses DEJA enregistrees chez
  // Pennylane, donc on le signale au lieu de le taire.
  let pennylaneSynced = false
  const customerId = options.pennylaneCustomerId ?? (client?.pennylane_customer_id as string | null)

  if (customerId && !isNaN(parseInt(customerId, 10)) && resolved.emails.length > 0) {
    const putResult = await pennylaneClient.put<Record<string, unknown>>(
      `/company_customers/${customerId}`,
      { emails: resolved.emails }
    )
    if (putResult.error) {
      console.error(
        '[FACTURATION:RECIPIENTS] Alignement des destinataires Pennylane echoue:',
        putResult.error
      )
    } else {
      pennylaneSynced = true
    }
  }

  return { data: { ...resolved, pennylaneSynced }, error: null }
}
