'use server'

import { createServerSupabaseClient } from '@monprojetpro/supabase'
import { type ActionResponse, successResponse, errorResponse } from '@monprojetpro/types'
import { ApplyParcoursTemplateInput } from '../types/parcours.types'
import { getParcoursTemplate } from '../templates/parcours-templates'

/**
 * Applique un « circuit type » (parcours préinstallé) à un client.
 *
 * - mode 'replace' : remplace le parcours existant (supprime les étapes actuelles puis installe le circuit).
 * - mode 'append'  : ajoute les agents du circuit à la suite, sans doublonner un agent déjà présent.
 *
 * Les agents du circuit sont référencés par NOM et résolus en ids ici (catalogue non-archivé).
 * Un agent introuvable est ignoré et remonté dans `skipped`.
 */
export async function applyParcoursTemplate(
  input: ApplyParcoursTemplateInput
): Promise<ActionResponse<{ count: number; skipped: string[] }>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return errorResponse('Non authentifié', 'UNAUTHORIZED')
    }

    const parsed = ApplyParcoursTemplateInput.safeParse(input)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return errorResponse(firstError, 'VALIDATION_ERROR', parsed.error.issues)
    }

    const { clientId, templateKey, mode } = parsed.data

    const template = getParcoursTemplate(templateKey)
    if (!template) {
      return errorResponse('Circuit type introuvable', 'VALIDATION_ERROR')
    }

    // Résoudre les agents du circuit (par nom) en ids — uniquement les non-archivés.
    const { data: agentsData, error: agentsError } = await supabase
      .from('elio_lab_agents')
      .select('id, name')
      .eq('archived', false)

    if (agentsError) {
      console.error('[PARCOURS:APPLY_TEMPLATE] Agents fetch error:', agentsError)
      return errorResponse('Erreur lors du chargement du catalogue d\'agents', 'DB_ERROR', {
        message: agentsError.message,
      })
    }

    const nameToId = new Map<string, string>()
    for (const a of (agentsData ?? []) as { id: string; name: string }[]) {
      nameToId.set(a.name, a.id)
    }

    const resolved: { agentId: string; stepLabel: string }[] = []
    const skipped: string[] = []
    for (const name of template.agentNames) {
      const id = nameToId.get(name)
      if (id) resolved.push({ agentId: id, stepLabel: name })
      else skipped.push(name)
    }

    if (resolved.length === 0) {
      return errorResponse(
        "Aucun agent de ce circuit n'est disponible dans le catalogue",
        'NO_AGENTS',
        { skipped }
      )
    }

    // Étapes existantes du client.
    const { data: existingData, error: existingError } = await supabase
      .from('client_parcours_agents')
      .select('id, elio_lab_agent_id, step_order')
      .eq('client_id', clientId)
      .order('step_order', { ascending: true })

    if (existingError) {
      console.error('[PARCOURS:APPLY_TEMPLATE] Existing fetch error:', existingError)
      return errorResponse('Erreur lors de la lecture du parcours', 'DB_ERROR', {
        message: existingError.message,
      })
    }

    const existing = (existingData ?? []) as { id: string; elio_lab_agent_id: string; step_order: number }[]
    const hadSteps = existing.length > 0

    type Row = {
      client_id: string
      elio_lab_agent_id: string
      step_order: number
      step_label: string
      status: 'active' | 'pending'
    }
    let rows: Row[] = []

    if (mode === 'replace') {
      // Repartir propre : on supprime les étapes existantes (client_step_contexts cascade ;
      // les conversations Élio orphelines restent sans danger — pas de FK sur step_id).
      if (hadSteps) {
        const { error: delError } = await supabase
          .from('client_parcours_agents')
          .delete()
          .eq('client_id', clientId)
        if (delError) {
          console.error('[PARCOURS:APPLY_TEMPLATE] Delete error:', delError)
          return errorResponse('Erreur lors du remplacement du parcours', 'DB_ERROR', {
            message: delError.message,
          })
        }
      }
      rows = resolved.map((s, index) => ({
        client_id: clientId,
        elio_lab_agent_id: s.agentId,
        step_order: index + 1,
        step_label: s.stepLabel,
        // 1ère étape active (le client peut démarrer), suivantes verrouillées.
        status: (index === 0 ? 'active' : 'pending') as 'active' | 'pending',
      }))
    } else {
      // append : ajouter à la suite, sans doublonner un agent déjà présent.
      const existingAgentIds = new Set(existing.map((e) => e.elio_lab_agent_id))
      const toAdd = resolved.filter((s) => !existingAgentIds.has(s.agentId))
      if (toAdd.length === 0) {
        return successResponse({ count: 0, skipped })
      }
      const maxOrder = existing.reduce((m, e) => Math.max(m, e.step_order), 0)
      rows = toAdd.map((s, index) => ({
        client_id: clientId,
        elio_lab_agent_id: s.agentId,
        step_order: maxOrder + index + 1,
        step_label: s.stepLabel,
        // Si le client n'avait aucune étape, la première devient active (comme un lancement).
        status: (!hadSteps && index === 0 ? 'active' : 'pending') as 'active' | 'pending',
      }))
    }

    const { error: insertError } = await supabase
      .from('client_parcours_agents')
      .insert(rows)

    if (insertError) {
      console.error('[PARCOURS:APPLY_TEMPLATE] Insert error:', insertError)
      return errorResponse("Erreur lors de l'installation du circuit", 'DB_ERROR', {
        message: insertError.message,
      })
    }

    // Notifier le client si ce circuit DÉMARRE son parcours (il n'avait aucune étape avant).
    if (!hadSteps && rows.length > 0) {
      const { data: clientRow } = await supabase
        .from('clients')
        .select('auth_user_id')
        .eq('id', clientId)
        .maybeSingle()
      const clientAuthUserId = (clientRow as { auth_user_id: string | null } | null)?.auth_user_id
      if (clientAuthUserId) {
        await supabase.from('notifications').insert({
          recipient_type: 'client',
          recipient_id: clientAuthUserId,
          type: 'parcours',
          title: 'Votre parcours Lab démarre !',
          body: `Découvrez l'étape 1 : ${rows[0].step_label}. Élio vous accompagne dès maintenant.`,
          link: '/modules/parcours/steps/1',
        })
      }
    }

    return successResponse({ count: rows.length, skipped })
  } catch (error) {
    console.error('[PARCOURS:APPLY_TEMPLATE] Unexpected error:', error)
    return errorResponse('Une erreur inattendue est survenue', 'INTERNAL_ERROR', {
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
