'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  createClientAuthUser,
  generateSecureTemporaryPassword,
} from '@monprojetpro/supabase/admin'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { LaunchClientParcoursInput } from '../types/parcours.types'
import { generateConciergeWord } from './generate-concierge-word'
import { sendWelcomeLabInvite } from '../utils/send-welcome-lab-invite'

export async function launchClientParcours(
  input: LaunchClientParcoursInput
): Promise<ActionResponse<{ count: number }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = LaunchClientParcoursInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { clientId, steps } = parsed.data

    // LOT E — Le mode de séquençage (client_configs.parcours_mode) décide des statuts initiaux :
    //   • 'libre'  : TOUTES les étapes sont 'active' dès le départ (navigables en parallèle).
    //   • 'tracee' : 1ère étape 'active', suivantes 'pending' (déverrouillage à la validation).
    const { data: cfgRow } = await supabase
      .from('client_configs')
      .select('parcours_mode')
      .eq('client_id', clientId)
      .maybeSingle()
    const isLibre = (cfgRow as { parcours_mode?: string } | null)?.parcours_mode === 'libre'

    const rows = steps.map((step, index) => ({
      client_id: clientId,
      elio_lab_agent_id: step.agentId,
      step_order: index + 1,
      step_label: step.stepLabel,
      status: (isLibre || index === 0 ? 'active' : 'pending') as 'active' | 'pending',
    }))

    const { error: insertError } = await supabase
      .from('client_parcours_agents')
      .insert(rows)

    if (insertError) {
      console.error('[PARCOURS:LAUNCH_CLIENT_PARCOURS] Insert error:', insertError)
      return errorResponse('Erreur lors du lancement du parcours', 'DB_ERROR', {
        message: insertError.message,
      })
    }

    // Notifier le client que son parcours démarre — kit complet : la cloche client
    // doit s'animer dès le lancement côté Hub (Realtime).
    const { data: clientRow } = await supabase
      .from('clients')
      .select('auth_user_id, email, name, first_name, first_login_at')
      .eq('id', clientId)
      .maybeSingle()

    const client = clientRow as {
      auth_user_id: string | null
      email: string | null
      name: string | null
      first_name: string | null
      first_login_at: string | null
    } | null
    let clientAuthUserId = client?.auth_user_id ?? null

    // Lancer un parcours Lab ne garantit pas qu'un compte auth existe déjà : seul le
    // webhook Pennylane et l'onboarding visio en créent un. Un client composé à la main
    // (CRM) peut arriver ici sans compte — sendWelcomeLabInvite (generateLink type:'recovery')
    // échouerait silencieusement (best-effort) et le client resterait sans moyen de se
    // connecter. On crée le compte ICI, au point où il devient réellement nécessaire, quel
    // que soit le chemin d'entrée du client — mot de passe temporaire jetable, jamais vu par
    // le client : il définit le sien via le lien de récupération envoyé juste après.
    if (client && !clientAuthUserId && client.email) {
      const authResult = await createClientAuthUser({
        email: client.email,
        password: generateSecureTemporaryPassword(),
      })

      if (authResult.error || !authResult.userId) {
        console.error(
          '[PARCOURS:LAUNCH_CLIENT_PARCOURS] Création du compte auth échouée:',
          authResult.error
        )
      } else {
        clientAuthUserId = authResult.userId
        const { error: linkError } = await supabase
          .from('clients')
          .update({ auth_user_id: clientAuthUserId })
          .eq('id', clientId)
        if (linkError) {
          console.error(
            '[PARCOURS:LAUNCH_CLIENT_PARCOURS] Liaison clients.auth_user_id échouée:',
            linkError
          )
        }
      }
    }

    if (clientAuthUserId) {
      await supabase.from('notifications').insert({
        recipient_type: 'client',
        recipient_id: clientAuthUserId,
        type: 'parcours',
        title: 'Votre parcours Lab démarre !',
        body: `Découvrez l'étape 1 : ${steps[0].stepLabel}. Élio vous accompagne dès maintenant.`,
        link: '/modules/parcours/steps/1',
      })
    }

    // « Mot d'Élio » vivant — best-effort : on NOURRIT le Concierge pour qu'il accueille
    // le client dans son parcours fraîchement lancé. Ne JAMAIS faire échouer le lancement.
    try {
      await generateConciergeWord(clientId, {
        type: 'parcours_started',
        agentLabel: steps[0].stepLabel,
      })
    } catch (e) {
      console.error('[PARCOURS:LAUNCH_CLIENT_PARCOURS] Mot d\'Élio non généré (ignoré):', e)
    }

    // LOT C — Email de bienvenue Lab envoyé MAINTENANT (après définition du parcours),
    // et non plus au paiement. Uniquement pour un client qui ne s'est JAMAIS connecté
    // (first_login_at null) : il reçoit un lien pour définir son mot de passe. Un client
    // déjà actif (parcours additionnel) est couvert par la notif + le mot d'Élio ci-dessus.
    // Best-effort : on ne fait JAMAIS échouer le lancement si l'email échoue.
    if (client?.email && !client.first_login_at) {
      try {
        const invite = await sendWelcomeLabInvite({
          email: client.email,
          // On S'ADRESSE au client : prénom, pas `name` (= nom de famille).
          clientName: client.first_name?.trim() || client.name || 'Cher(e) client(e)',
          firstStepLabel: steps[0].stepLabel,
        })
        if (!invite.success) {
          console.error('[PARCOURS:LAUNCH_CLIENT_PARCOURS] Email invitation KO:', invite.error)
          // Prévenir l'opérateur qui a lancé le parcours (lui seul peut agir).
          await supabase.from('notifications').insert({
            recipient_type: 'operator',
            recipient_id: user.id,
            type: 'alert',
            title: '⚠️ Email d\'invitation Lab non envoyé',
            body: `Le parcours est lancé mais l'email d'invitation au client n'a pas pu être envoyé (${invite.error ?? 'erreur inconnue'}). Tu peux le relancer manuellement.`,
            link: `/modules/crm/clients/${clientId}`,
          })
        }
      } catch (e) {
        console.error('[PARCOURS:LAUNCH_CLIENT_PARCOURS] Email invitation exception (ignorée):', e)
      }
    }

    return successResponse({ count: rows.length })
  } catch (error) {
    console.error('[PARCOURS:LAUNCH_CLIENT_PARCOURS] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
