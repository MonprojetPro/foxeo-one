'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import {
  createClientAuthUser,
  generateSecureTemporaryPassword,
} from '@monprojetpro/supabase/admin'
import { CreateLabOnboardingInput } from './post-meeting-schemas'
export type { CreateLabOnboardingInput } from './post-meeting-schemas'

export interface LabOnboardingResult {
  clientId: string
  parcoursId: string
}

export async function createLabOnboarding(
  input: CreateLabOnboardingInput
): Promise<ActionResponse<LabOnboardingResult>> {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

  const parsed = CreateLabOnboardingInput.safeParse(input)
  if (!parsed.success) {
    return errorResponse('Données invalides', 'VALIDATION_ERROR', parsed.error.issues)
  }

  const { meetingId, clientName, clientEmail, parcoursTemplateId } = parsed.data

  // Récupérer operator_id
  const { data: operator, error: operatorError } = await supabase
    .from('operators')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (operatorError || !operator) {
    return errorResponse('Opérateur non trouvé', 'NOT_FOUND')
  }

  // Vérifier que l'email n'est pas déjà utilisé
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('email', clientEmail)
    .eq('operator_id', operator.id)
    .maybeSingle()

  if (existingClient) {
    return errorResponse('Un client avec cet email existe déjà', 'CONFLICT')
  }

  // Créer le compte Auth du client MAINTENANT — pas au paiement, pas plus tard.
  // Pourquoi ici : l'email d'accès part au LANCEMENT du parcours (launchClientParcours →
  // sendWelcomeLabInvite), qui génère un lien via generateLink({ type: 'recovery' }).
  // Ce type EXIGE que l'email corresponde déjà à un compte Supabase Auth existant — sans
  // ce compte créé ici, l'invitation échouerait au lancement (best-effort → juste loguée,
  // jamais vue). Mot de passe temporaire jetable : le client ne le reçoit jamais, il
  // définit le sien via le lien de récupération envoyé au lancement du parcours (LOT C).
  const authResult = await createClientAuthUser({
    email: clientEmail,
    password: generateSecureTemporaryPassword(),
  })

  if (authResult.error || !authResult.userId) {
    console.error('[VISIO:ONBOARD_PROSPECT] Auth user creation failed:', authResult.error)
    return errorResponse('Échec création du compte client', 'AUTH_ERROR', authResult.error)
  }

  // Créer client (prospect)
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      operator_id: operator.id,
      name: clientName,
      email: clientEmail,
      status: 'prospect',
      client_type: 'complet',
      auth_user_id: authResult.userId,
    })
    .select()
    .single()

  if (clientError || !client) {
    console.error('[VISIO:ONBOARD_PROSPECT] Client creation failed:', clientError)
    return errorResponse('Échec création client', 'DATABASE_ERROR', clientError)
  }

  // Récupérer template parcours
  const { data: template, error: templateError } = await supabase
    .from('parcours_templates')
    .select('id, name, stages')
    .eq('id', parcoursTemplateId)
    .single()

  if (templateError || !template) {
    return errorResponse('Template parcours non trouvé', 'NOT_FOUND')
  }

  // Créer parcours (adapté au vrai schéma: active_stages, template_id, operator_id)
  const { data: parcours, error: parcoursError } = await supabase
    .from('parcours')
    .insert({
      client_id: client.id,
      template_id: parcoursTemplateId,
      operator_id: operator.id,
      active_stages: template.stages,
      status: 'en_cours',
    })
    .select()
    .single()

  if (parcoursError || !parcours) {
    console.error('[VISIO:ONBOARD_PROSPECT] Parcours creation failed:', parcoursError)
    return errorResponse('Échec création parcours', 'DATABASE_ERROR', parcoursError)
  }

  // Mettre à jour meeting avec metadata prospect
  await supabase
    .from('meetings')
    .update({ metadata: { prospect_converted: true, client_id: client.id } })
    .eq('id', meetingId)

  // PLUS d'email envoyé ici (bug corrigé — cf. docs/lab-one-lifecycle.md §8.1) : ce flow
  // insère encore dans l'ancienne table `parcours`, jamais dans `client_parcours_agents`
  // (le système réellement lu par le client). Tant qu'aucun parcours d'agents Élio n'est
  // composé, envoyer l'email d'accès livre un client sur un espace vide. L'email part
  // désormais au LANCEMENT du parcours (launchClientParcours → sendWelcomeLabInvite),
  // comme pour tous les autres clients — jamais dupliqué ici.
  //
  // Notifier MiKL explicitement (convention stricte : recipient_id = auth_user_id de
  // l'opérateur, type dans la liste autorisée par notifications_type_check, title
  // NOT NULL, pas de colonne `read`) qu'il lui reste à composer le parcours pour que
  // l'accès parte au client. Best-effort : ne doit jamais faire échouer la création.
  const { error: notifError } = await supabase.from('notifications').insert({
    recipient_type: 'operator',
    recipient_id: user.id,
    type: 'alert',
    title: 'Parcours Lab à composer',
    body: `${clientName} a été créé depuis la visio. Compose son parcours pour envoyer l'accès à son espace Lab.`,
    link: `/modules/crm/clients/${client.id}`,
  })
  if (notifError) {
    console.error('[VISIO:ONBOARD_PROSPECT] Notification opérateur non envoyée:', notifError)
  }

  console.log('[VISIO:ONBOARD_PROSPECT] Client créé (parcours à composer):', client.id)

  return successResponse({ clientId: client.id, parcoursId: parcours.id })
}
