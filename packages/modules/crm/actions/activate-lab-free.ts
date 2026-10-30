'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { ensureClientAuthAccount, sendWelcomeLabInvite } from '@monprojetpro/supabase/admin'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'
import { ActivateLabFreeInput as ActivateLabFreeInputSchema } from '../types/crm.types'
import type { ActivateLabFreeInput } from '../types/crm.types'

// T-067 — Porte d'entrée unique « Déclencher le Lab », option gratuite (sans
// facturation). Pendant de la voie payante (webhook Pennylane, inchangé) : active
// l'espace ET crée le compte client (email + lien de personnalisation du mot de passe)
// dans le MÊME geste, quelle que soit l'option choisie — décision MiKL du 30-10. Le
// choix des agents/du parcours reste une étape séparée, une fois le Lab actif.
export async function activateLabFree(
  input: ActivateLabFreeInput
): Promise<ActionResponse<{ clientId: string }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = ActivateLabFreeInputSchema.safeParse(input)
    if (!parsed.success) {
      return errorResponse('Données invalides', 'VALIDATION_ERROR', parsed.error.flatten())
    }
    const { clientId } = parsed.data

    const { data: operator, error: opError } = await supabase
      .from('operators')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (opError || !operator) {
      return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
    }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, first_name, email, auth_user_id, client_configs(lab_mode_available)')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return errorResponse('Client introuvable', 'NOT_FOUND')
    }

    type ConfigJoin = { lab_mode_available: boolean | null } | null
    const rawConfig = (client as unknown as { client_configs: ConfigJoin | ConfigJoin[] }).client_configs
    const config: ConfigJoin = Array.isArray(rawConfig) ? (rawConfig[0] ?? null) : rawConfig

    if (config?.lab_mode_available === true) {
      return errorResponse('Le Lab est déjà actif pour ce client', 'ALREADY_ACTIVE')
    }

    const authResult = await ensureClientAuthAccount({
      supabase: supabase as unknown as SupabaseClient,
      clientId,
      email: client.email as string | null,
      authUserId: client.auth_user_id as string | null,
    })

    if (authResult.error) {
      console.error('[CRM:ACTIVATE_LAB_FREE] Compte auth non créé:', authResult.error)
      return errorResponse(
        'Impossible de créer le compte du client',
        'AUTH_ERROR',
        authResult.error
      )
    }

    const { error: configError } = await supabase
      .from('client_configs')
      .update({
        dashboard_type: 'lab',
        lab_mode_available: true,
        elio_lab_enabled: true,
      })
      .eq('client_id', clientId)

    if (configError) {
      console.error('[CRM:ACTIVATE_LAB_FREE] Config update error:', configError)
      return errorResponse(
        'Impossible d\'activer le Lab',
        'DATABASE_ERROR',
        configError
      )
    }

    // Email « votre espace Lab est prêt », uniquement si le compte vient d'être créé —
    // un client déjà existant (réactivation) n'a pas besoin d'un nouveau lien.
    if (authResult.created && client.email) {
      const invite = await sendWelcomeLabInvite({
        email: client.email as string,
        clientName: (client.first_name as string | null)?.trim() || (client.name as string | null) || 'Cher(e) client(e)',
      })
      if (!invite.success) {
        console.error('[CRM:ACTIVATE_LAB_FREE] Email invitation KO:', invite.error)
        await supabase.from('notifications').insert({
          recipient_type: 'operator',
          recipient_id: user.id,
          type: 'alert',
          title: '⚠️ Email d\'invitation Lab non envoyé',
          body: `Le Lab est activé mais l'email d'invitation au client n'a pas pu être envoyé (${invite.error ?? 'erreur inconnue'}). Tu peux le relancer manuellement.`,
          link: `/modules/crm/clients/${clientId}`,
        })
      }
    }

    await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operator.id,
      action: 'lab_activated_free',
      entity_type: 'client',
      entity_id: clientId,
      metadata: { accountCreated: authResult.created },
    })

    revalidatePath('/crm')
    revalidatePath(`/crm/clients/${clientId}`)

    return successResponse({ clientId })
  } catch (error) {
    console.error('[CRM:ACTIVATE_LAB_FREE] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
