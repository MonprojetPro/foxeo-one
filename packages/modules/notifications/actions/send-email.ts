'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import {
  type ActionResponse,
  successResponse,
  errorResponse,
} from '@monprojetpro/types'

/**
 * Interpole les variables dans un template HTML.
 * Remplace {{variable}} par la valeur correspondante.
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return variables[key] ?? `{{${key}}}`
  })
}

export interface GraduationEmailInput {
  clientId: string
}

/**
 * Server Action — Envoie l'email de graduation via Supabase Edge Function.
 *
 * Appelle la fonction Edge 'send-graduation-email' qui gère l'envoi Resend.
 * L'envoi email est non-bloquant : une erreur d'envoi est loggée mais ne
 * bloque pas la graduation (AC : "ne bloque pas l'action").
 * Retourne toujours { data, error } — jamais throw.
 */
export async function sendGraduationEmail(
  input: GraduationEmailInput
): Promise<ActionResponse<{ sent: boolean }>> {
  const { clientId } = input

  if (!clientId) {
    return errorResponse('clientId requis', 'VALIDATION_ERROR')
  }

  const supabase = await createServerSupabaseClient()

  // Charger les infos du client pour construire l'email
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select(`
      id,
      name,
      company_name,
      created_at,
      graduated_at,
      client_configs(dashboard_type, active_modules),
      client_instances(instance_url, active_modules, tier),
      step_submissions(id)
    `)
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    console.error('[NOTIFICATIONS:EMAIL:GRADUATION] Client not found:', clientError)
    return errorResponse('Client introuvable', 'NOT_FOUND', clientError)
  }

  // Calcul durée Lab (de la création du client à la graduation)
  const graduatedAt = client.graduated_at ? new Date(client.graduated_at) : new Date()
  const graduationDate = graduatedAt.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const instance = Array.isArray(client.client_instances)
    ? client.client_instances[0]
    : client.client_instances
  const instanceUrl = instance?.instance_url ?? 'https://app.monprojet-pro.com'

  const modules: string[] = Array.isArray(instance?.active_modules)
    ? instance.active_modules
    : ['core-dashboard']

  const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const modulesHtml = modules
    .map((m: string) => `<span class="module-tag">${escapeHtml(m)}</span>`)
    .join('\n        ')

  // Calcul durée Lab (created_at → graduated_at)
  const createdAt = (client as Record<string, unknown>).created_at
    ? new Date((client as Record<string, unknown>).created_at as string)
    : null
  const labDurationDays = createdAt
    ? Math.max(1, Math.round((graduatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)))
    : null
  const labDuration = labDurationDays
    ? `${labDurationDays} jour${labDurationDays > 1 ? 's' : ''}`
    : '—'

  // Nombre d'étapes Lab soumises
  const submissions = Array.isArray(client.step_submissions) ? client.step_submissions : []
  const labStepsCompleted = submissions.length > 0 ? String(submissions.length) : '—'

  // Appel Edge Function pour envoi email (Resend)
  const { error: fnError } = await supabase.functions.invoke('send-graduation-email', {
    body: {
      clientId,
      variables: {
        clientName: client.name ?? 'Cher(e) client(e)',
        companyName: client.company_name ?? '',
        labDuration,
        labStepsCompleted,
        graduationDate,
        modules: modulesHtml,
        instanceUrl,
      },
    },
  })

  if (fnError) {
    console.error('[NOTIFICATIONS:EMAIL:GRADUATION] Edge function error:', fnError)
    // Non-bloquant : on log mais on retourne succès partiel
    return successResponse({ sent: false })
  }

  return successResponse({ sent: true })
}
