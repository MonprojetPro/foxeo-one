'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  ensureClientAuthAccount,
  sendWelcomeLabInvite,
  sendWelcomeOneInvite,
} from '@monprojetpro/supabase/admin'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

// T-067e — bouton "Renvoyer les identifiants" du header client. Contrairement aux 3
// points d'entrée d'activation (activate-lab-free, toggle-access, upgrade-client), qui
// n'envoient l'email QUE si le compte vient d'être créé, ici c'est un geste explicite de
// MiKL : on renvoie TOUJOURS un lien frais, que le compte existe déjà ou pas, et une
// erreur d'envoi remonte à l'écran au lieu de finir en notification silencieuse.
export async function resendClientCredentials(
  clientId: string
): Promise<ActionResponse<{ sentAt: string }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

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
      .select('id, name, first_name, email, auth_user_id, client_configs(lab_mode_available, one_mode_available)')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return errorResponse('Client introuvable', 'NOT_FOUND')
    }

    if (!client.email) {
      return errorResponse('Ce client n\'a pas d\'email — impossible d\'envoyer les identifiants', 'NO_EMAIL')
    }

    type ConfigJoin = { lab_mode_available: boolean | null; one_mode_available: boolean | null } | null
    const rawConfig = (client as unknown as { client_configs: ConfigJoin | ConfigJoin[] }).client_configs
    const config: ConfigJoin = Array.isArray(rawConfig) ? (rawConfig[0] ?? null) : rawConfig
    const hasLab = config?.lab_mode_available === true
    const hasOne = config?.one_mode_available === true

    // T-073d — ce bouton ne DECIDE plus jamais Lab ou One tout seul : il ne peut que
    // renvoyer un lien pour un accès déjà déclenché par un vrai parcours (« Activer le
    // Lab » ou le toggle One). Sans ça, il devait deviner via `dashboard_type` — qui ne
    // reflète qu'un défaut d'affichage, jamais une décision réelle (cf. T-073a/b/c, même
    // root cause). Demande de MiKL : « on ne sait pas si l'espace doit être ouvert au
    // Lab, au One ou les deux » — la réponse est : CE bouton ne doit jamais trancher ça.
    if (!hasLab && !hasOne) {
      return errorResponse(
        'Aucun espace activé pour ce client — utilise « Activer le Lab » ou ouvre l\'accès One avant de pouvoir envoyer un lien',
        'NO_ACCESS_ACTIVATED'
      )
    }

    const authResult = await ensureClientAuthAccount({
      supabase: supabase as unknown as SupabaseClient,
      clientId,
      email: client.email as string,
      authUserId: client.auth_user_id as string | null,
    })

    if (authResult.error) {
      console.error('[CRM:RESEND_CREDENTIALS] Compte auth non créé:', authResult.error)
      return errorResponse('Impossible de créer le compte du client', 'AUTH_ERROR', authResult.error)
    }

    const clientName = (client.first_name as string | null)?.trim() || (client.name as string | null) || 'Cher(e) client(e)'

    // Si les deux sont ouverts (client gradué), le lien sert d'abord le One — l'accès
    // Lab reste de toute façon disponible une fois connecté (même compte, les deux
    // modes cohabitent — cf. resolveClientMode).
    const invite = hasOne
      ? await sendWelcomeOneInvite({ email: client.email as string, clientName })
      : await sendWelcomeLabInvite({ email: client.email as string, clientName })

    if (!invite.success) {
      console.error('[CRM:RESEND_CREDENTIALS] Email invitation KO:', invite.error)
      return errorResponse(
        `L'email n'a pas pu être envoyé (${invite.error ?? 'erreur inconnue'})`,
        'EMAIL_ERROR'
      )
    }

    const sentAt = new Date().toISOString()

    await supabase
      .from('clients')
      .update({ welcome_email_sent_at: sentAt })
      .eq('id', clientId)

    await supabase.from('activity_logs').insert({
      actor_type: 'operator',
      actor_id: operator.id,
      action: 'welcome_credentials_resent',
      entity_type: 'client',
      entity_id: clientId,
      metadata: { accountCreated: authResult.created },
    })

    revalidatePath('/crm')
    revalidatePath(`/crm/clients/${clientId}`)

    return successResponse({ sentAt })
  } catch (error) {
    console.error('[CRM:RESEND_CREDENTIALS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', error)
  }
}
