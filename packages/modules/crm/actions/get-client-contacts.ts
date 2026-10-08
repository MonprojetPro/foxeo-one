'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import type { ClientContact, ClientContactDB } from '../types/crm.types'

// ============================================================
// getClientContacts — T-039, carnet de contacts d'un client
//
// Ordre d'affichage : les contacts qui recoivent la facture d'abord (c'est ce que
// MiKL vient verifier avant d'emettre), puis l'ordre de saisie. Le tri est fait en
// base pour qu'il soit le meme partout — l'ecran et la resolution des
// destinataires ne doivent pas pouvoir diverger sur « qui est le premier ».
// ============================================================

export async function getClientContacts(clientId: string): Promise<ActionResponse<ClientContact[]>> {
  try {
    if (!clientId) return errorResponse('Client requis', 'VALIDATION_ERROR')

    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    const { data, error } = await supabase
      .from('client_contacts')
      .select('*')
      .eq('client_id', clientId)
      .order('receives_invoices', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[CRM:GET_CONTACTS] Select error:', error)
      return errorResponse('Impossible de charger les contacts', 'FETCH_FAILED', error)
    }

    const contacts = (data ?? []).map((row) =>
      toCamelCase<ClientContactDB, ClientContact>(row as ClientContactDB)
    )

    return successResponse(contacts)
  } catch (error) {
    console.error('[CRM:GET_CONTACTS] Unexpected error:', error)
    return errorResponse('Erreur interne', 'INTERNAL_ERROR', error)
  }
}
