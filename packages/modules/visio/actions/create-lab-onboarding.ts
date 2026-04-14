'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
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

  // Créer client (prospect)
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      operator_id: operator.id,
      name: clientName,
      email: clientEmail,
      status: 'prospect',
      client_type: 'complet',
      auth_user_id: null,
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

  // Envoyer email de bienvenue (non-bloquant)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (supabaseUrl && serviceRoleKey) {
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: clientEmail,
          template: 'welcome-lab',
          data: {
            clientName,
            parcoursName: template.name,
            activationLink: `${process.env.NEXT_PUBLIC_CLIENT_URL ?? ''}/activate?client_id=${client.id}`,
          },
        }),
      })
    } catch (emailErr) {
      // Email non-bloquant : loguer mais ne pas échouer l'action
      console.error('[VISIO:ONBOARD_PROSPECT] Email failed (non-blocking):', emailErr)
    }
  }

  console.log('[VISIO:ONBOARD_PROSPECT] Client créé:', client.id)

  return successResponse({ clientId: client.id, parcoursId: parcours.id })
}
