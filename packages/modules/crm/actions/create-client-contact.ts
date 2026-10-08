'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import type { ClientContact, ClientContactDB, CreateClientContactInput } from '../types/crm.types'
import { CreateClientContactInput as CreateClientContactSchema } from '../types/crm.types'

// ============================================================
// createClientContact — T-039
//
// ⚠️ `clients.contact` n'est PAS ecrit ici : un trigger en base
// (`trg_client_contacts_sync_label`) le tient a jour depuis le carnet. UN SEUL
// ECRIVAIN — sinon l'en-tete de fiche, la liste des clients et l'export CSV, qui
// lisent tous cette colonne, finiraient par afficher trois valeurs differentes.
// ============================================================

export async function createClientContact(
  input: CreateClientContactInput
): Promise<ActionResponse<ClientContact>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    if (opError || !operator) return errorResponse('Opérateur non trouvé', 'NOT_FOUND')

    const parsed = CreateClientContactSchema.safeParse(input)
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? 'Données invalides',
        'VALIDATION_ERROR',
        parsed.error.issues
      )
    }

    const { clientId, fullName, email, note, receivesInvoices, showOnInvoice } = parsed.data

    const { data, error } = await supabase
      .from('client_contacts')
      .insert({
        client_id: clientId,
        operator_id: operator.id,
        full_name: fullName.trim(),
        // Chaine vide -> null : une adresse « presente mais vide » passerait la
        // contrainte NOT NULL et partirait chez Pennylane comme destinataire.
        email: email && email.trim() !== '' ? email.trim() : null,
        note: note && note.trim() !== '' ? note.trim() : null,
        receives_invoices: receivesInvoices === true,
        show_on_invoice: showOnInvoice === true,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('[CRM:CREATE_CONTACT] Insert error:', error)
      return errorResponse('Impossible de créer le contact', 'CREATE_FAILED', error)
    }

    return successResponse(toCamelCase<ClientContactDB, ClientContact>(data as ClientContactDB))
  } catch (error) {
    console.error('[CRM:CREATE_CONTACT] Unexpected error:', error)
    return errorResponse('Erreur interne', 'INTERNAL_ERROR', error)
  }
}
