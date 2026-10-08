'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { toCamelCase } from '@monprojetpro/utils'
import type { ClientContact, ClientContactDB, UpdateClientContactInput } from '../types/crm.types'
import { UpdateClientContactInput as UpdateClientContactSchema } from '../types/crm.types'

// ============================================================
// updateClientContact — T-039
// ============================================================

export async function updateClientContact(
  input: UpdateClientContactInput
): Promise<ActionResponse<ClientContact>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    const parsed = UpdateClientContactSchema.safeParse(input)
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? 'Données invalides',
        'VALIDATION_ERROR',
        parsed.error.issues
      )
    }

    const { contactId, fullName, email, note, receivesInvoices, showOnInvoice } = parsed.data

    const { data, error } = await supabase
      .from('client_contacts')
      .update({
        full_name: fullName.trim(),
        email: email && email.trim() !== '' ? email.trim() : null,
        note: note && note.trim() !== '' ? note.trim() : null,
        receives_invoices: receivesInvoices === true,
        show_on_invoice: showOnInvoice === true,
      })
      .eq('id', contactId)
      .select()
      .single()

    if (error || !data) {
      console.error('[CRM:UPDATE_CONTACT] Update error:', error)
      // La RLS ne laisse passer que les contacts de l'operateur : un id inconnu
      // ou appartenant a quelqu'un d'autre ne rend AUCUNE ligne, sans lever —
      // donc on ne peut pas le distinguer d'un echec, et on ne l'invente pas.
      return errorResponse('Impossible de modifier le contact', 'UPDATE_FAILED', error)
    }

    return successResponse(toCamelCase<ClientContactDB, ClientContact>(data as ClientContactDB))
  } catch (error) {
    console.error('[CRM:UPDATE_CONTACT] Unexpected error:', error)
    return errorResponse('Erreur interne', 'INTERNAL_ERROR', error)
  }
}
