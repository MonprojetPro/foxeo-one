'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'

// ============================================================
// deleteClientContact — T-039
//
// 🔑 LA SUPPRESSION N'EST PAS BLOQUEE quand le contact etait le dernier
// destinataire de facturation, et c'est un choix : le refus empecherait de
// retirer une comptable partie de l'entreprise, ce qui est exactement le moment
// ou on en a besoin. La facture ne partira pas dans le vide pour autant — elle
// repart sur `clients.email`, le repli general (zone d'ombre 3 de T-039).
//
// En revanche on ne laisse pas MiKL le DECOUVRIR : l'action rend le nombre de
// destinataires restants et l'adresse de repli, pour que l'ecran le dise.
// ============================================================

export type DeleteClientContactResult = {
  /** Destinataires de facturation encore coches apres la suppression */
  remainingRecipients: number
  /** Adresse qui recevra les factures s il n en reste aucun (identifiant de connexion du client) */
  fallbackEmail: string | null
}

export async function deleteClientContact(
  contactId: string
): Promise<ActionResponse<DeleteClientContactResult>> {
  try {
    if (!contactId) return errorResponse('Contact requis', 'VALIDATION_ERROR')

    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

    // On lit le client AVANT de supprimer : apres, la ligne n'existe plus et on
    // n'aurait plus de quoi compter les destinataires restants.
    const { data: contact, error: readError } = await supabase
      .from('client_contacts')
      .select('client_id')
      .eq('id', contactId)
      .maybeSingle()

    if (readError) {
      console.error('[CRM:DELETE_CONTACT] Read error:', readError)
      return errorResponse('Impossible de lire le contact', 'FETCH_FAILED', readError)
    }
    if (!contact) return errorResponse('Contact introuvable', 'NOT_FOUND')

    const clientId = contact.client_id as string

    const { error: deleteError } = await supabase
      .from('client_contacts')
      .delete()
      .eq('id', contactId)

    if (deleteError) {
      console.error('[CRM:DELETE_CONTACT] Delete error:', deleteError)
      return errorResponse('Impossible de supprimer le contact', 'DELETE_FAILED', deleteError)
    }

    const { count } = await supabase
      .from('client_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('receives_invoices', true)

    const { data: client } = await supabase
      .from('clients')
      .select('email')
      .eq('id', clientId)
      .maybeSingle()

    return successResponse({
      remainingRecipients: count ?? 0,
      fallbackEmail: (client?.email as string | null) ?? null,
    })
  } catch (error) {
    console.error('[CRM:DELETE_CONTACT] Unexpected error:', error)
    return errorResponse('Erreur interne', 'INTERNAL_ERROR', error)
  }
}
